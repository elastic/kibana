/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import {
  IMMUTABLE_STRUCTURAL_SETTINGS,
  MUTABLE_STRUCTURAL_SETTINGS,
  NON_MAPPING_KEYS,
  STRUCTURAL_KEYS,
  isMutableParameter,
} from './allowlist';
import type { BackingType, VerifyResult, Violation, Drift } from './types';

type Properties = Record<string, MappingProperty>;

const propertiesOf = (node: MappingTypeMapping | MappingProperty): Properties =>
  ('properties' in node && node.properties ? node.properties : {}) as Properties;

const fieldsOf = (node: MappingProperty): Properties =>
  ('fields' in node && node.fields ? node.fields : {}) as Properties;

const typeOf = (node: MappingProperty): string | undefined =>
  'type' in node ? (node.type as string) : undefined;

const join = (path: string, segment: string): string => (path ? `${path}.${segment}` : segment);

/**
 * Decides whether the step from one declared mappings version to the next is genuinely
 * additive.
 *
 * Fail-safe by construction: a difference is only accepted when something explicitly
 * permits it. Anything unrecognised is a violation, so a parameter nobody has classified
 * blocks the migration rather than silently passing.
 *
 * Removal is not a violation. Elasticsearch never removes a mapped field, so refusing
 * would block a legitimate declaration cleanup. On a rolling template the field simply
 * stops appearing in new backing indices and the change is free; on a live concrete index
 * the field stays and the declaration diverges from reality, which is reported as drift.
 */
export const verifyAdditive = (
  previous: MappingTypeMapping,
  next: MappingTypeMapping,
  backing: BackingType = 'concrete_index'
): VerifyResult => {
  const violations: Violation[] = [];
  const drift: Drift[] = [];

  compareSettings(previous, next, '', violations);
  compareProperties(propertiesOf(previous), propertiesOf(next), '', backing, violations, drift);

  return { ok: violations.length === 0, violations, drift };
};

const compareProperties = (
  previous: Properties,
  next: Properties,
  path: string,
  backing: BackingType,
  violations: Violation[],
  drift: Drift[]
): void => {
  for (const [name, before] of Object.entries(previous)) {
    const fieldPath = join(path, name);
    const after = next[name];

    if (after === undefined) {
      if (backing === 'concrete_index') {
        drift.push({
          path: fieldPath,
          kind: 'field_removed',
          detail:
            'declared removal is not applied - Elasticsearch keeps the mapped field, so the ' +
            'declaration no longer matches the index',
        });
      }
      continue;
    }

    compareField(before, after, fieldPath, backing, violations, drift);
  }

  // Anything only present in the new version is a plain addition, which is always safe.
};

const compareField = (
  before: MappingProperty,
  after: MappingProperty,
  path: string,
  backing: BackingType,
  violations: Violation[],
  drift: Drift[]
): void => {
  const beforeType = typeOf(before);
  const afterType = typeOf(after);

  if (beforeType !== afterType) {
    violations.push({
      path,
      kind: 'type_changed',
      detail: `type changed from "${beforeType ?? 'object'}" to "${afterType ?? 'object'}"`,
    });
    // A retyped field makes every other difference on it meaningless.
    return;
  }

  compareSettings(before, after, path, violations, beforeType);
  compareSubFields(fieldsOf(before), fieldsOf(after), path, violations);
  compareProperties(propertiesOf(before), propertiesOf(after), path, backing, violations, drift);
};

/**
 * Sub-fields are their own category rather than a parameter change: adding one is legal
 * in Elasticsearch and happens in practice, while removing or retyping one is refused for
 * the same reason as the parent field.
 */
const compareSubFields = (
  previous: Properties,
  next: Properties,
  path: string,
  violations: Violation[]
): void => {
  for (const [name, before] of Object.entries(previous)) {
    const subPath = `${path}.fields.${name}`;
    const after = next[name];

    if (after === undefined) {
      violations.push({ path: subPath, kind: 'subfield_removed', detail: 'sub-field removed' });
      continue;
    }

    if (typeOf(before) !== typeOf(after)) {
      violations.push({
        path: subPath,
        kind: 'subfield_retyped',
        detail: `sub-field type changed from "${typeOf(before)}" to "${typeOf(after)}"`,
      });
    }
  }
};

const compareSettings = (
  before: MappingTypeMapping | MappingProperty,
  after: MappingTypeMapping | MappingProperty,
  path: string,
  violations: Violation[],
  fieldType?: string
): void => {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of keys) {
    if (STRUCTURAL_KEYS.includes(key) || NON_MAPPING_KEYS.includes(key)) {
      continue;
    }

    const valueBefore = (before as Record<string, unknown>)[key];
    const valueAfter = (after as Record<string, unknown>)[key];

    if (JSON.stringify(valueBefore) === JSON.stringify(valueAfter)) {
      continue;
    }

    if (IMMUTABLE_STRUCTURAL_SETTINGS.includes(key)) {
      violations.push({
        path: path || '<root>',
        kind: 'structural_immutable',
        detail: `"${key}" cannot be updated once set`,
      });
      continue;
    }

    if (MUTABLE_STRUCTURAL_SETTINGS.includes(key)) {
      continue;
    }

    if (isMutableParameter(fieldType, key)) {
      continue;
    }

    violations.push({
      path: path || '<root>',
      kind: 'parameter_immutable',
      detail:
        `"${key}" cannot be changed on an existing ${fieldType ?? 'field'} ` +
        `(${JSON.stringify(valueBefore)} -> ${JSON.stringify(valueAfter)})`,
    });
  }
};

/** A refusal message that names each violation and points at the only safe route. */
export const describeViolations = (migrationId: string, version: number, result: VerifyResult) =>
  [
    `es-index-migration [${migrationId}]: version ${version} is declared "additive" but is not.`,
    ...result.violations.map(({ path, detail }) => `  - ${path}: ${detail}`),
    'Elasticsearch cannot apply these in place. Add a new field alongside the old one, backfill',
    'it in a data step, then stop writing the old one in a later release.',
  ].join('\n');
