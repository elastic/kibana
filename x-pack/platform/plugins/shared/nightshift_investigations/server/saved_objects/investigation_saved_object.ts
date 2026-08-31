/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import {
  MAX_BLIND_SPOTS,
  MAX_HYPOTHESES,
  MAX_IMPACT_ENTITIES,
  MAX_RECOMMENDATIONS,
  MAX_SIGNIFICANT_EVENT_UPDATES,
  MAX_TEXT_LENGTH,
} from '@kbn/significant-events-schema';
import {
  INVESTIGATION_STATUSES,
  INVESTIGATION_SUBJECT_TYPES,
  INVESTIGATION_TRIGGER_TYPES,
  MAX_KEYWORD_LENGTH,
} from '../../common';
import type { InvestigationAttributes } from '../storage/types';

export const NIGHTSHIFT_INVESTIGATION_SO_TYPE = 'nightshift-investigation';

const MAX_ISO_DATE_LENGTH = 64;

const isoDateStringSchema = schema.string({
  maxLength: MAX_ISO_DATE_LENGTH,
  validate: (value) => {
    if (isNaN(Date.parse(value))) {
      return 'must be a valid ISO 8601 date string';
    }
  },
});

const investigationAttributesSchemaV1 = schema.object({
  investigation_id: schema.string({ maxLength: MAX_KEYWORD_LENGTH }),
  status: schema.string({
    maxLength: MAX_KEYWORD_LENGTH,
    validate: (value) => {
      if (!INVESTIGATION_STATUSES.some((s) => s === value)) {
        return `must be one of: ${INVESTIGATION_STATUSES.join(', ')}`;
      }
    },
  }),
  subject_type: schema.string({
    maxLength: MAX_KEYWORD_LENGTH,
    validate: (value) => {
      if (!INVESTIGATION_SUBJECT_TYPES.some((s) => s === value)) {
        return `must be one of: ${INVESTIGATION_SUBJECT_TYPES.join(', ')}`;
      }
    },
  }),
  subject_id: schema.string({ maxLength: MAX_KEYWORD_LENGTH }),
  subject_summary: schema.maybe(schema.string({ maxLength: MAX_TEXT_LENGTH })),
  trigger_type: schema.string({
    maxLength: MAX_KEYWORD_LENGTH,
    validate: (value) => {
      if (!INVESTIGATION_TRIGGER_TYPES.some((t) => t === value)) {
        return `must be one of: ${INVESTIGATION_TRIGGER_TYPES.join(', ')}`;
      }
    },
  }),
  concurrency_key: schema.maybe(schema.string({ maxLength: MAX_KEYWORD_LENGTH })),
  created_at: isoDateStringSchema,
  completed_at: schema.maybe(isoDateStringSchema),
  executed_by: schema.maybe(schema.string({ maxLength: MAX_KEYWORD_LENGTH })),
  error: schema.maybe(schema.string({ maxLength: MAX_TEXT_LENGTH })),
  summary: schema.maybe(schema.string({ maxLength: MAX_TEXT_LENGTH })),
  conclusion: schema.maybe(schema.string({ maxLength: MAX_TEXT_LENGTH })),
  hypotheses: schema.maybe(
    schema.arrayOf(schema.object({}, { unknowns: 'allow' }), { maxSize: MAX_HYPOTHESES })
  ),
  recommendations: schema.maybe(
    schema.arrayOf(schema.object({}, { unknowns: 'allow' }), { maxSize: MAX_RECOMMENDATIONS })
  ),
  blind_spots: schema.maybe(
    schema.arrayOf(schema.object({}, { unknowns: 'allow' }), { maxSize: MAX_BLIND_SPOTS })
  ),
  significant_event_updates: schema.maybe(
    schema.arrayOf(schema.object({}, { unknowns: 'allow' }), {
      maxSize: MAX_SIGNIFICANT_EVENT_UPDATES,
    })
  ),
  conversation_id: schema.maybe(schema.string({ maxLength: MAX_KEYWORD_LENGTH })),
  impact: schema.maybe(
    schema.object({
      entities: schema.arrayOf(schema.object({}, { unknowns: 'allow' }), {
        maxSize: MAX_IMPACT_ENTITIES,
      }),
    })
  ),
});

export const nightshiftInvestigationSavedObjectType: SavedObjectsType<InvestigationAttributes> = {
  name: NIGHTSHIFT_INVESTIGATION_SO_TYPE,
  hidden: true,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      status: { type: 'keyword', ignore_above: 1024 },
      subject_type: { type: 'keyword', ignore_above: 1024 },
      subject_id: { type: 'keyword', ignore_above: 1024 },
      subject_summary: { type: 'text' },
      concurrency_key: { type: 'keyword', ignore_above: 1024 },
      created_at: { type: 'date' },
      completed_at: { type: 'date' },
      summary: { type: 'text' },
      conclusion: { type: 'text' },
      hypotheses: { type: 'flattened', ignore_above: 1024 },
      impact: { type: 'flattened', ignore_above: 1024 },
    },
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: investigationAttributesSchemaV1,
        forwardCompatibility: investigationAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
      },
    },
  },
};
