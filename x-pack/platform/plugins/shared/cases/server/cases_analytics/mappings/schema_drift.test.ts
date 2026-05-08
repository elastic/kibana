/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObject } from '@kbn/core/server';
import { CASE_SAVED_OBJECT, CASE_USER_ACTION_SAVED_OBJECT } from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import { CasePersistedSeverity, CasePersistedStatus } from '../../common/types/case';
import type { UserActionPersistedAttributes } from '../../common/types/user_actions';
import { CASE_INDEX_MAPPING } from './case';
import { CASE_ACTIVITY_INDEX_MAPPING } from './case_activity';
import { CASE_LIFECYCLE_INDEX_MAPPING } from './case_lifecycle';
import { buildActivityDoc } from '../writer/activity_doc_builder';
import { buildCaseDoc } from '../writer/case_doc_builder';
import { buildLifecycleDoc } from '../writer/lifecycle_doc_builder';
import { ALL_TEMPLATE_TYPE_SUFFIXES } from '../data_view/runtime_fields';

/**
 * Schema drift guard.
 *
 * The three analytic indices are mapped `dynamic: 'strict'` — any field a doc
 * builder emits that isn't in the corresponding mapping causes ES to reject
 * the write with `mapper_parsing_exception`. The writer's `.catch` swallow
 * means that failure is silent: the API response succeeds, no doc lands, and
 * the only signal is an ERROR log easy to miss.
 *
 * These tests round-trip a maximally-populated synthetic case through each
 * doc builder and assert every emitted dotted path resolves to a property in
 * the mapping. CI-time guard against the foot-gun where a future SO field
 * gets added to `buildCaseDoc` (or any builder) and the mapping update is
 * forgotten.
 *
 * Extended-field paths under `cases.extended_fields.*` are excluded — those
 * land via the dynamic template, not the static properties.
 */

const fixedNow = () => '2026-05-07T12:00:00.000Z';

const fullCaseSO = (): SavedObject<CasePersistedAttributes> =>
  ({
    type: CASE_SAVED_OBJECT,
    id: 'case-1',
    namespaces: ['default'],
    references: [],
    attributes: {
      owner: 'securitySolution',
      title: 'A title',
      description: 'A description',
      tags: ['tag1', 'tag2'],
      category: 'malware',
      assignees: [{ uid: 'u-1' }],
      severity: CasePersistedSeverity.MEDIUM,
      status: CasePersistedStatus.CLOSED,
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-02T00:00:00.000Z',
      closed_at: '2026-05-03T00:00:00.000Z',
      created_by: {
        username: 'jane',
        full_name: 'Jane Doe',
        email: 'j@e.com',
        profile_uid: 'p-1',
      },
      closed_by: null,
      updated_by: null,
      duration: 12345,
      total_alerts: 3,
      total_comments: 5,
      connector: { name: 'none', type: '.none', fields: null } as any,
      external_service: null,
      settings: { syncAlerts: false },
      observables: { foo: 'bar' } as any,
      customFields: [{ key: 'cf', type: 'text', value: 'x' }] as any,
      extended_fields: { riskScore_as_long: '42' },
    } as unknown as CasePersistedAttributes,
  } as SavedObject<CasePersistedAttributes>);

const fullActivitySO = (): SavedObject<UserActionPersistedAttributes> => ({
  type: CASE_USER_ACTION_SAVED_OBJECT,
  id: 'ua-1',
  namespaces: ['default'],
  references: [{ type: CASE_SAVED_OBJECT, id: 'case-1', name: 'associated-cases' }],
  attributes: {
    owner: 'securitySolution',
    action: 'create',
    type: 'comment',
    payload: { comment: { type: 'user', comment: 'hi' } },
    created_at: '2026-05-01T00:01:00.000Z',
    created_by: {
      username: 'jane',
      full_name: 'Jane Doe',
      email: 'j@e.com',
      profile_uid: 'p-1',
    },
  } as unknown as UserActionPersistedAttributes,
});

/** Walk a parsed doc and produce dotted-path keys for every leaf field. */
const flatten = (doc: unknown, prefix = ''): string[] => {
  if (doc == null || typeof doc !== 'object' || Array.isArray(doc)) {
    return prefix ? [prefix] : [];
  }
  const keys: string[] = [];
  for (const [k, v] of Object.entries(doc as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatten(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
};

/** Build the set of mapped dotted paths from a mapping tree. */
const collectMappedPaths = (mapping: MappingTypeMapping): Set<string> => {
  const out = new Set<string>();
  const walk = (node: Record<string, MappingProperty>, prefix: string): void => {
    for (const [k, prop] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${k}` : k;
      out.add(path);
      // `enabled: false` objects swallow everything underneath them — every
      // sub-path is implicitly mapped (as an opaque blob). Mark the parent
      // and skip recursion.
      if ((prop as { enabled?: boolean }).enabled === false) {
        continue;
      }
      const props = (prop as { properties?: Record<string, MappingProperty> }).properties;
      if (props) walk(props, path);
    }
  };
  if (mapping.properties) walk(mapping.properties, '');
  return out;
};

/** True if `path` is exactly mapped, OR a descendant of an `enabled:false` object. */
const isCovered = (path: string, mappedPaths: Set<string>): boolean => {
  if (mappedPaths.has(path)) return true;
  // Walk up the path until we find a parent that's mapped as enabled:false.
  // Implementation: chop `.<segment>` from the right and check membership.
  // We can't tell from the set alone that a parent is enabled:false, so the
  // collector adds parents explicitly and `walk` skips recursion under them —
  // meaning the parent appears in the set but no children do. So the rule is:
  // path is covered if itself or any prefix is in the set.
  let p = path;
  while (true) {
    const idx = p.lastIndexOf('.');
    if (idx < 0) break;
    p = p.slice(0, idx);
    if (mappedPaths.has(p)) return true;
  }
  return false;
};

/** Skip extended_fields contents — those land via dynamic_templates. */
const isExtendedFieldsLeaf = (path: string): boolean => path.startsWith('cases.extended_fields.');

/**
 * Snake-key collision guard.
 *
 * Typed runtime fields are published at the **top-level** path
 * `cases.<snakeKey>` (e.g. `cases.score_as_long`) — sitting alongside
 * `cases.title`, `cases.severity`, etc. The painless reads from the indexed
 * keyword path `cases.extended_fields.<snakeKey>` and emits the typed value.
 *
 * For this scheme to be collision-safe, **no top-level mapped field on a case
 * surface may end in `_as_<type>` for any type the template system can emit.**
 * If one ever did, Kibana data views would resolve that path to the indexed
 * keyword (because mapped fields override runtime ones during merge), and the
 * typed runtime field would silently disappear from Lens / Discover.
 *
 * The set of suffixes we have to defend against is exported as
 * `ALL_TEMPLATE_TYPE_SUFFIXES` from the runtime-fields module — that's the
 * authoritative list keyed off `BaseFieldSchema.type`. Adding a new template
 * field type updates that list and these tests automatically widen with it.
 */
const expectNoSnakeKeyCollisions = (mapping: MappingTypeMapping): void => {
  const collisions: string[] = [];
  // Walk every dotted path in the mapping and assert that the **leaf segment**
  // doesn't end with `_as_<type>`. We check leaf segment rather than full path
  // because a runtime field at `cases.foo_as_long` collides with a mapped
  // `cases.foo_as_long` regardless of nesting depth — only the last segment
  // matters for the data-view merge.
  const walk = (node: Record<string, MappingProperty>, prefix: string): void => {
    for (const [k, prop] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${k}` : k;
      for (const suffix of ALL_TEMPLATE_TYPE_SUFFIXES) {
        if (k.endsWith(`_as_${suffix}`)) {
          collisions.push(path);
          break;
        }
      }
      const props = (prop as { properties?: Record<string, MappingProperty> }).properties;
      if (props) walk(props, path);
    }
  };
  if (mapping.properties) walk(mapping.properties, '');
  expect(collisions).toEqual([]);
};

describe('snake-key collision guard (runtime field naming invariant)', () => {
  it('case mapping has no top-level field ending in _as_<type>', () => {
    expectNoSnakeKeyCollisions(CASE_INDEX_MAPPING);
  });

  it('case_lifecycle mapping has no top-level field ending in _as_<type>', () => {
    expectNoSnakeKeyCollisions(CASE_LIFECYCLE_INDEX_MAPPING);
  });
});

describe('analytic index mappings cover every doc-builder field', () => {
  it('case surface', () => {
    const doc = buildCaseDoc(fullCaseSO(), fixedNow);
    const mapped = collectMappedPaths(CASE_INDEX_MAPPING);
    const missing = flatten(doc)
      .filter((p) => !isExtendedFieldsLeaf(p))
      .filter((p) => !isCovered(p, mapped));
    expect(missing).toEqual([]);
  });

  it('case_activity surface', () => {
    const doc = buildActivityDoc(fullActivitySO(), fixedNow);
    expect(doc).not.toBeNull();
    const mapped = collectMappedPaths(CASE_ACTIVITY_INDEX_MAPPING);
    const missing = flatten(doc).filter((p) => !isCovered(p, mapped));
    expect(missing).toEqual([]);
  });

  it('case_lifecycle surface', () => {
    const doc = buildLifecycleDoc(fullCaseSO(), [fullActivitySO()], fixedNow);
    const mapped = collectMappedPaths(CASE_LIFECYCLE_INDEX_MAPPING);
    const missing = flatten(doc)
      .filter((p) => !isExtendedFieldsLeaf(p))
      .filter((p) => !isCovered(p, mapped));
    expect(missing).toEqual([]);
  });
});
