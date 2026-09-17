/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type ObjectType } from '@kbn/config-schema';
import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import {
  alertingV1RawRuleTemplateSchemaV4,
  alertingV2RawRuleTemplateReadSchemaV4,
  alertingV2RawRuleTemplateSchemaV5,
  rawRuleTemplateSchemaV1,
  rawRuleTemplateSchemaV2,
  rawRuleTemplateSchemaV3,
  rawRuleTemplateSchemaV4,
  rawRuleTemplateSchemaV5,
} from '../schemas/raw_rule_template';
import { migrateV2RuleTemplateQueryShape } from './migrate_v2_rule_template_query_shape';

/**
 * Read schema for the model versions that predate the query collapse. The v2
 * branch drops the collapsed keys so a node on one of these versions sees only
 * the shape it knows how to validate.
 */
const preCollapseForwardCompatibility = schema.oneOf([
  alertingV1RawRuleTemplateSchemaV4.extends({}, { unknowns: 'ignore' }),
  alertingV2RawRuleTemplateReadSchemaV4,
]) as unknown as ObjectType;

export const ruleTemplateModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: rawRuleTemplateSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: rawRuleTemplateSchemaV1,
    },
  },
  '2': {
    changes: [],
    schemas: {
      forwardCompatibility: rawRuleTemplateSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: rawRuleTemplateSchemaV2,
    },
  },
  '3': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          description: {
            type: 'text',
          },
        },
      },
    ],
    schemas: {
      forwardCompatibility: rawRuleTemplateSchemaV3.extends({}, { unknowns: 'ignore' }),
      create: rawRuleTemplateSchemaV3,
    },
  },
  /**
   * Adds top-level `engine`, accepts either engine v1 or v2
   * shapes, and backfills `engine` so existing values become searchable under the
   * new mapping.
   *
   * oneOf schemas are valid at runtime for create validation but are not ObjectType;
   * cast to satisfy the model-version schema typings.
   */
  '4': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          engine: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      {
        type: 'data_backfill',
        backfillFn: (document) => {
          const { engine } = document.attributes;
          if (engine === undefined) {
            return { attributes: { engine: 'v1' } };
          }
          return { attributes: { engine } };
        },
      },
    ],
    schemas: {
      forwardCompatibility: preCollapseForwardCompatibility,
      create: rawRuleTemplateSchemaV4 as unknown as ObjectType,
    },
  },
  /**
   * Indexes the alerting v2 template fields nested under `rule` that the v2 read
   * APIs search, tag-filter, sort, and aggregate on. Attributes are unchanged, so
   * the model version 4 schemas still apply and no backfill is needed.
   */
  '5': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          rule: {
            properties: {
              metadata: {
                properties: {
                  name: {
                    type: 'text',
                    fields: {
                      keyword: {
                        type: 'keyword',
                        ignore_above: 256,
                      },
                    },
                  },
                  description: {
                    type: 'text',
                  },
                  tags: {
                    type: 'keyword',
                    ignore_above: 128,
                  },
                },
              },
            },
          },
        },
      },
    ],
    schemas: {
      forwardCompatibility: preCollapseForwardCompatibility,
      create: rawRuleTemplateSchemaV4 as unknown as ObjectType,
    },
  },
  /**
   * Collapses the alerting v2 rule embedded under `rule` onto the single `query`
   * shape with `recovery` / `no_data` objects, matching alerting v2 rule model
   * version 6.
   *
   * Additive, so `rule` keeps its pre-collapse keys for the rollback window and
   * the v2 read path strips them; model version 7 removes them from disk. The
   * embedded rule is validated by Zod rather than by this schema, so the model
   * version 4 create schema still applies.
   */
  '6': {
    changes: [
      {
        type: 'unsafe_transform',
        transformFn: (typeSafeGuard) => typeSafeGuard(migrateV2RuleTemplateQueryShape),
      },
    ],
    schemas: {
      forwardCompatibility: schema.oneOf([
        alertingV1RawRuleTemplateSchemaV4.extends({}, { unknowns: 'ignore' }),
        alertingV2RawRuleTemplateSchemaV5.extends({}, { unknowns: 'ignore' }),
      ]) as unknown as ObjectType,
      create: rawRuleTemplateSchemaV5 as unknown as ObjectType,
    },
  },
};
