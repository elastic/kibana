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
  MAX_TRIGGER_FEEDBACK,
  MAX_TEXT_LENGTH,
  SEVERITY_OPTIONS,
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

const keyword = schema.string({ maxLength: MAX_KEYWORD_LENGTH });
const optionalKeyword = schema.maybe(keyword);
const optionalText = schema.maybe(schema.string({ maxLength: MAX_TEXT_LENGTH }));

const enumOf = <T extends readonly string[]>(options: T) =>
  schema.string({
    maxLength: MAX_KEYWORD_LENGTH,
    validate: (value) => {
      if (!options.some((v) => v === value)) {
        return `must be one of: ${options.join(', ')}`;
      }
    },
  });

const opaqueArray = (maxSize: number) =>
  schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }), { maxSize }));

const investigationAttributesSchemaV1 = schema.object({
  status: enumOf(INVESTIGATION_STATUSES),
  subject_type: enumOf(INVESTIGATION_SUBJECT_TYPES),
  subject_id: keyword,
  subject_summary: optionalText,
  trigger_type: enumOf(INVESTIGATION_TRIGGER_TYPES),
  concurrency_key: optionalKeyword,
  created_at: isoDateStringSchema,
  started_at: schema.maybe(isoDateStringSchema),
  completed_at: schema.maybe(isoDateStringSchema),
  executed_by: optionalKeyword,
  error: optionalText,
  summary: optionalText,
  conclusion: optionalText,
  severity: schema.maybe(enumOf(SEVERITY_OPTIONS)),
  hypotheses: opaqueArray(MAX_HYPOTHESES),
  recommendations: opaqueArray(MAX_RECOMMENDATIONS),
  blind_spots: opaqueArray(MAX_BLIND_SPOTS),
  trigger_feedback: opaqueArray(MAX_TRIGGER_FEEDBACK),
  conversation_id: optionalKeyword,
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
      started_at: { type: 'date' },
      completed_at: { type: 'date' },
      summary: { type: 'text' },
      conclusion: { type: 'text' },
      severity: { type: 'keyword', ignore_above: 1024 },
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
