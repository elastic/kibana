/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObject } from '@kbn/core/server';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import { CasePersistedSeverity, CasePersistedStatus } from '../../common/types/case';
import { ALL_TEMPLATE_TYPE_SUFFIXES } from '../data_view/runtime_fields';
import { buildCaseDoc } from '../writer/case_doc_builder';
import { CASE_INDEX_MAPPING } from './case';

/**
 * Schema drift guard.
 *
 * The `.cases` index is mapped `dynamic: 'strict'` — any field a doc builder
 * emits that isn't in the mapping fails the write with `mapper_parsing_exception`.
 * The writer's `.catch` swallow means that failure is silent: the API
 * response succeeds, no doc lands, and the only signal is an ERROR log.
 *
 * This test round-trips a maximally-populated synthetic case through
 * `buildCaseDoc` and asserts every emitted dotted path resolves to a
 * property in `CASE_INDEX_MAPPING`. Catches the foot-gun where a future SO
 * field gets added to the doc builder and the mapping update is forgotten.
 *
 * Excluded paths:
 *   - `cases.extended_fields.*`: lands via the dynamic_template, not static
 *     properties.
 *   - `cases.observables.*`: lands via the dynamic_template (denormalized
 *     per-typeKey keys are dynamic).
 */

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
      tags: ['tag1'],
      category: 'malware',
      assignees: [{ uid: 'u-1' }],
      severity: CasePersistedSeverity.HIGH,
      status: CasePersistedStatus.CLOSED,
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-02T00:00:00.000Z',
      closed_at: '2026-05-03T00:00:00.000Z',
      in_progress_at: '2026-05-01T01:00:00.000Z',
      created_by: { username: 'jane', full_name: 'J', email: 'j@e.com', profile_uid: 'p-1' },
      closed_by: { username: 'jane', full_name: 'J', email: 'j@e.com', profile_uid: 'p-1' },
      updated_by: { username: 'jane', full_name: 'J', email: 'j@e.com', profile_uid: 'p-1' },
      duration: 12345,
      total_alerts: 3,
      total_comments: 5,
      total_events: 1,
      total_observables: 2,
      time_to_acknowledge: 60000,
      time_to_investigate: 120000,
      time_to_resolve: 300000,
      incremental_id: 42,
      template: { id: 't-1', version: 1 },
      connector: { name: 'jira', type: '.jira', fields: { key: 'k', value: 'v' } } as never,
      external_service: {
        pushed_at: '2026-05-02T00:00:00.000Z',
        pushed_by: { username: 'jane', full_name: 'J', email: 'j@e.com', profile_uid: 'p-1' },
        connector_name: 'jira',
        external_id: 'JIRA-1',
        external_title: 'Title',
        external_url: 'http://jira',
      } as never,
      settings: { syncAlerts: false },
      observables: [{ typeKey: 'url', value: 'http://x.com', description: '' }] as never,
      customFields: [{ key: 'cf', type: 'text', value: 'x' }] as never,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      extended_fields: { riskScore_as_long: '42' },
    } as CasePersistedAttributes,
  } as SavedObject<CasePersistedAttributes>);

/** Produce dotted paths for every leaf field of a parsed doc. */
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

/** Set of mapped dotted paths from the mapping tree. */
const collectMappedPaths = (mapping: MappingTypeMapping): Set<string> => {
  const out = new Set<string>();
  const walk = (node: Record<string, MappingProperty>, prefix: string): void => {
    for (const [k, prop] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${k}` : k;
      out.add(path);
      // `enabled: false` swallows everything underneath — record the parent
      // but stop walking. Same for `dynamic: true` subtrees, which match
      // children via the dynamic_template.
      const stopAtParent =
        (prop as { enabled?: boolean }).enabled === false ||
        (prop as { dynamic?: boolean | string }).dynamic === true;
      if (!stopAtParent) {
        const props = (prop as { properties?: Record<string, MappingProperty> }).properties;
        if (props) walk(props, path);
      }
    }
  };
  if (mapping.properties) walk(mapping.properties, '');
  return out;
};

/** True if `path` is exactly mapped, OR is a descendant of an `enabled:false` or `dynamic:true` object. */
const isCovered = (path: string, mappedPaths: Set<string>): boolean => {
  if (mappedPaths.has(path)) return true;
  let p = path;
  while (true) {
    const idx = p.lastIndexOf('.');
    if (idx < 0) break;
    p = p.slice(0, idx);
    if (mappedPaths.has(p)) return true;
  }
  return false;
};

describe('case mapping covers every doc-builder field', () => {
  it('every path emitted by buildCaseDoc resolves to a mapping property', () => {
    const doc = buildCaseDoc(fullCaseSO());
    const mapped = collectMappedPaths(CASE_INDEX_MAPPING);
    const missing = flatten(doc).filter((p) => !isCovered(p, mapped));
    expect(missing).toEqual([]);
  });
});

/**
 * Snake-key collision guard.
 *
 * Typed runtime fields are published at `cases.<snakeKey>` (e.g.
 * `cases.score_as_long`) — direct children of `cases`. The strict collision
 * is at the exact full path `cases.<snake>`; checking the leaf segment
 * everywhere is broader-than-strictly-necessary defense against future
 * naming-confusion foot-guns and against any future widening of the runtime
 * publication scheme.
 *
 * The set of suffixes is exported from `data_view/runtime_fields.ts` as
 * `ALL_TEMPLATE_TYPE_SUFFIXES` — adding a new template type extends the test
 * automatically.
 */
const leafEndsInTypeSuffix = (path: string): boolean => {
  const leaf = path.slice(path.lastIndexOf('.') + 1);
  return ALL_TEMPLATE_TYPE_SUFFIXES.some((suffix) => leaf.endsWith(`_as_${suffix}`));
};

describe('snake-key collision guard (runtime field naming invariant)', () => {
  it('no field in the case mapping ends in _as_<type>', () => {
    const collisions = [...collectMappedPaths(CASE_INDEX_MAPPING)].filter(leafEndsInTypeSuffix);
    expect(collisions).toEqual([]);
  });
});
