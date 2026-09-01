/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { allOrAnyStringOrArray, dateType } from './common';
import { durationType } from './duration';
import { indicatorSchema } from './indicators';
import { MAX_ARRAY_LENGTH, MAX_KEYWORD_LENGTH } from './limits';
import { timeWindowSchema } from './time_window';
import {
  MAX_PROJECT_ROUTINGS_LENGTH,
  MAX_SLO_ID_LENGTH,
  MIN_SLO_ID_LENGTH,
  PROJECT_ROUTINGS_EMPTY_MESSAGE,
  PROJECT_ROUTINGS_TOO_LONG_MESSAGE,
  SLO_ID_INVALID_MESSAGE,
  SLO_ID_REGEX,
} from '../validation_constants';

const occurrencesBudgetingMethodSchema = z.literal('occurrences');
const timeslicesBudgetingMethodSchema = z.literal('timeslices');

const budgetingMethodSchema = z
  .union([occurrencesBudgetingMethodSchema, timeslicesBudgetingMethodSchema])
  .meta({
    id: 'SLOBudgetingMethod',
    description: 'The budgeting method to use when computing the rollup data.',
  });

const targetSchema = z.object({
  target: z.number().describe('the target objective between 0 and 1 excluded'),
});

const objectiveSchema = targetSchema
  .extend({
    timesliceTarget: z
      .number()
      .describe('the target objective for each slice when using a timeslices budgeting method')
      .optional(),
    timesliceWindow: durationType
      .describe(
        'the duration of each slice when using a timeslices budgeting method, as {duraton}{unit}'
      )
      .optional(),
  })
  .meta({ id: 'SLOObjective', description: 'Defines properties for the SLO objective' });

const boundedProjectRoutingSchema = z
  .string()
  .max(MAX_PROJECT_ROUTINGS_LENGTH, PROJECT_ROUTINGS_TOO_LONG_MESSAGE)
  .refine((value) => value.trim().length > 0, PROJECT_ROUTINGS_EMPTY_MESSAGE)
  .describe(
    'ES ProjectRouting expression controlling which linked projects the L1 rollup reads. ' +
      'When set (including null), overrides preventCrossProjectSearch. null and `_alias:_origin` mean origin only; ' +
      '`_alias:*` means all linked projects. Subset example `_id:p1 AND _id:p2`.'
  );

const settingsSchema = z
  .object({
    syncDelay: durationType.describe(
      'The time delay in minutes between the current time and the latest source data time. ' +
        'Increasing the value will delay any alerting. The default value is 1 minute. ' +
        'The minimum value is 1m and the maximum is 359m. It should always be greater then source index refresh interval.'
    ),
    frequency: durationType.describe(
      'The interval between checks for changes in the source data. The minimum value is 1m and the maximum is 59m. The default value is 1 minute.'
    ),
    preventInitialBackfill: z
      .boolean()
      .describe(
        'Start aggregating data from the time the SLO is created, instead of backfilling data from the beginning of the time window.'
      ),
    syncField: z
      .string()
      .max(MAX_KEYWORD_LENGTH)
      .describe(
        'The date field that is used to identify new documents in the source. ' +
          'It is strongly recommended to use a field that contains the ingest timestamp. ' +
          'If you use a different field, you might need to set the delay such that it accounts for data transmission delays. ' +
          'When unspecified, we use the indicator timestamp field.'
      )
      .nullable()
      .optional(),
    /** @deprecated use projectRoutings */
    preventCrossProjectSearch: z
      .boolean()
      .describe(
        'Pin the L1 rollup transform to the local/origin project only, preventing flat-world (cross-linked-project) reads. ' +
          'Only applies on serverless. Default is false, meaning rollup transforms target all linked projects.'
      )
      .optional(),
    projectRoutings: boundedProjectRoutingSchema.nullable().optional(),
  })
  .meta({ id: 'SLOSettings', description: 'Defines properties for SLO settings.' });

const groupBySchema = allOrAnyStringOrArray.meta({
  id: 'SLOGroupBy',
  description: 'optional group by field or fields to use to generate an SLO per distinct value',
});

const optionalSettingsSchema = settingsSchema.partial();

const tagsSchema = z
  .array(z.string().max(MAX_KEYWORD_LENGTH))
  .max(MAX_ARRAY_LENGTH)
  .describe('List of tags');

// id cannot contain special characters and spaces
const sloIdSchema = z
  .string()
  .min(MIN_SLO_ID_LENGTH, SLO_ID_INVALID_MESSAGE)
  .max(MAX_SLO_ID_LENGTH, SLO_ID_INVALID_MESSAGE)
  .regex(SLO_ID_REGEX, SLO_ID_INVALID_MESSAGE)
  .describe('The identifier of the SLO.');

const baseSloSchema = z.object({
  id: sloIdSchema,
  name: z.string().describe('The name of the SLO.'),
  description: z.string().describe('The description of the SLO.'),
  indicator: indicatorSchema,
  timeWindow: timeWindowSchema,
  budgetingMethod: budgetingMethodSchema,
  objective: objectiveSchema,
  settings: settingsSchema,
  revision: z.number().describe('The SLO revision'),
  enabled: z.boolean().describe('Indicate if the SLO is enabled'),
  tags: tagsSchema,
  createdAt: dateType.describe('The creation date'),
  updatedAt: dateType.describe('The last update date'),
  groupBy: groupBySchema,
  version: z.number().describe('The internal SLO version'),
  createdBy: z.string().describe('The user who created the SLO.').optional(),
  updatedBy: z.string().describe('The user who last updated the SLO.').optional(),
});

const dashboardsWithIdSchema = z.object({
  dashboards: z
    .array(
      z.object({ id: z.string().max(MAX_KEYWORD_LENGTH).describe('Dashboard saved-object id') })
    )
    .max(MAX_ARRAY_LENGTH)
    .describe('Array of dashboard references')
    .optional(),
});
const dashboardsWithRefIdSchema = z.object({
  dashboards: z
    .array(
      z.object({ refId: z.string().max(MAX_KEYWORD_LENGTH).describe('Dashboard reference id') })
    )
    .max(MAX_ARRAY_LENGTH)
    .describe('Array of dashboard references')
    .optional(),
});

const artifactsWithIdSchema = dashboardsWithIdSchema.meta({
  id: 'SLOArtifacts',
  description: 'Links to related assets for the SLO',
});

const sloDefinitionSchema = baseSloSchema
  .extend({ artifacts: artifactsWithIdSchema.optional() })
  .meta({ id: 'SLODefinition', description: 'The SLO definition' });
const storedSloDefinitionSchema = baseSloSchema.extend({
  artifacts: dashboardsWithRefIdSchema.optional(),
});

export {
  boundedProjectRoutingSchema,
  budgetingMethodSchema,
  dashboardsWithIdSchema,
  groupBySchema,
  objectiveSchema,
  occurrencesBudgetingMethodSchema,
  optionalSettingsSchema,
  settingsSchema,
  sloDefinitionSchema,
  sloIdSchema,
  storedSloDefinitionSchema,
  tagsSchema,
  targetSchema,
  timeslicesBudgetingMethodSchema,
};
