/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Synthetic entity definitions for performance / scale testing.
 *
 * 89 definitions (perf.entity.001 … perf.entity.089) bring the total engine count
 * to 100 (11 real + 89 synthetic), exercising:
 *   - task manager scheduling pressure (one task per type per namespace, 1m interval)
 *   - latest-index upsert concurrency (all engines write to the same latest index)
 *   - component-template breadth (one template per engine)
 *
 * Field budget: 4 unique fields × 89 definitions = 356 unique fields + ~60 shared = ~416.
 * The latest index allows 2000 total; this leaves room for future expansion.
 *
 * Every 10th definition (010, 020, … 080) uses a two-branch euidRanking to exercise the
 * composite-identity code path. All others use the cheaper singleField identity.
 *
 * All documents feed into `logs-perf.entity-default` which matches the default `logs-*`
 * source pattern — no additionalIndexPatterns needed.
 *
 * Usage:
 *   POST /api/security/entity_store/install
 *   { "entityTypes": ["perf.entity.001", "perf.entity.002", ...] }
 */

import {
  ENTITY_SOURCE_FIELD_EVALUATION,
  getCommonFieldDescriptions,
  getEntityFieldsDescriptions,
  isNotEmptyCondition,
} from './common_fields';
import type { EntityDefinitionWithoutId, EntityType } from './entity_schema';
import { BASE_ENTITY_TYPES } from './entity_schema';
import { collectValues, newestValue } from './field_retention_operations';

/** Number of performance entity types (not counting the 11 real types). */
export const PERF_ENTITY_TYPE_COUNT = 89;

/** Number of unique perf.entity.NNN.* fields per definition. Keep ≤ 8. */
const UNIQUE_FIELDS_PER_DEF = 4;

const BASE_SET = new Set<string>(BASE_ENTITY_TYPES);

/**
 * All entity types that belong to the performance-test set.
 * Derived from the EntityType enum at runtime to stay in sync with entity_schema.ts.
 */
export const getPerfEntityTypes = (allEntityTypes: readonly EntityType[]): EntityType[] =>
  allEntityTypes.filter((t) => !BASE_SET.has(t));

const pad = (n: number) => String(n).padStart(3, '0');

/** True for every 10th definition — exercises composite-identity (euidRanking) code path. */
const isCompositeIdentity = (n: number) => n % 10 === 0;

// ES|QL field identifiers must not have numeric-starting segments (e.g. `perf.entity.001.id`
// fails because `001` starts with a digit). Field names therefore use underscores:
//   perf_entity_001_id, perf_entity_001_name, perf_entity_001_attr_0 …
// The entity TYPE name (`perf.entity.001`) is fine — it is stored/queried as a keyword string
// value, never as an ES|QL column identifier.

/** Field name helpers — valid ES|QL identifiers (no numeric-starting segments). */
const idField = (tag: string) => `perf_entity_${tag}_id`;
const nameField = (tag: string) => `perf_entity_${tag}_name`;
const altIdField = (tag: string) => `perf_entity_${tag}_id_alt`;
const attrField = (tag: string, k: number) => `perf_entity_${tag}_attr_${k}`;

/** Build one synthetic entity definition for index n (1-based). */
const makePerfEntityDefinition = (n: number): EntityDefinitionWithoutId => {
  const tag = pad(n);
  const typeName = `perf.entity.${tag}` as EntityType;
  const id = idField(tag);
  const name = nameField(tag);
  const attrs = Array.from({ length: UNIQUE_FIELDS_PER_DEF - 2 }, (_, k) => attrField(tag, k));

  if (isCompositeIdentity(n)) {
    // Branch 1: prefer primary id field. Branch 2 (no when): fallback to secondary.
    const secondaryId = altIdField(tag);
    return {
      type: typeName,
      name: `Perf entity ${tag} (composite identity)`,
      identityField: {
        euidRanking: {
          branches: [
            {
              when: isNotEmptyCondition(id),
              ranking: [[{ field: id }]],
            },
            {
              ranking: [[{ field: secondaryId }]],
            },
          ],
        },
        documentsFilter: {
          or: [isNotEmptyCondition(id), isNotEmptyCondition(secondaryId)],
        },
      },
      indexPatterns: [],
      fieldEvaluations: [ENTITY_SOURCE_FIELD_EVALUATION],
      fields: [
        newestValue({ destination: 'entity.name', source: name }),
        newestValue({ source: name }),
        newestValue({ source: id }),
        newestValue({ source: secondaryId }),
        ...attrs.map((src) => collectValues({ source: src })),
        ...getCommonFieldDescriptions('entity'),
        ...getEntityFieldsDescriptions(),
      ],
    } as const satisfies EntityDefinitionWithoutId;
  }

  return {
    type: typeName,
    name: `Perf entity ${tag}`,
    identityField: { singleField: id },
    indexPatterns: [],
    fieldEvaluations: [ENTITY_SOURCE_FIELD_EVALUATION],
    fields: [
      newestValue({ destination: 'entity.name', source: name }),
      newestValue({ source: name }),
      newestValue({ source: id }),
      ...attrs.map((src) => collectValues({ source: src })),
      ...getCommonFieldDescriptions('entity'),
      ...getEntityFieldsDescriptions(),
    ],
  } as const satisfies EntityDefinitionWithoutId;
};

/** Map of entityType → definition, ready to spread into the definition registry. */
export const perfEntityDefinitions: Record<string, EntityDefinitionWithoutId> = Object.fromEntries(
  Array.from({ length: PERF_ENTITY_TYPE_COUNT }, (_, i) => {
    const n = i + 1;
    const tag = pad(n);
    return [`perf.entity.${tag}`, makePerfEntityDefinition(n)];
  })
);
