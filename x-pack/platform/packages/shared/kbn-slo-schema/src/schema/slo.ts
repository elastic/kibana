/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Either } from 'fp-ts/Either';
import * as t from 'io-ts';
import { allOrAnyStringOrArray, dateType } from './common';
import { durationType } from './duration';
import { indicatorSchema } from './indicators';
import { timeWindowSchema } from './time_window';
import {
  MAX_PROJECT_ROUTINGS_LENGTH,
  MAX_SLO_ID_LENGTH,
  MIN_SLO_ID_LENGTH,
  PROJECT_ROUTINGS_EMPTY_MESSAGE,
  PROJECT_ROUTINGS_TOO_LONG_MESSAGE,
  SLO_ID_INVALID_MESSAGE,
  SLO_ID_REGEX,
} from './validation_constants';

const occurrencesBudgetingMethodSchema = t.literal('occurrences');
const timeslicesBudgetingMethodSchema = t.literal('timeslices');

const budgetingMethodSchema = t.union([
  occurrencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema,
]);

const targetSchema = t.type({ target: t.number });

const objectiveSchema = t.intersection([
  targetSchema,
  t.partial({ timesliceTarget: t.number, timesliceWindow: durationType }),
]);

const boundedProjectRoutingSchema = new t.Type<string, string, unknown>(
  'boundedProjectRoutingSchema',
  t.string.is,
  (input, context): Either<t.Errors, string> => {
    if (typeof input !== 'string') {
      return t.failure(input, context);
    }

    if (input.trim().length === 0) {
      return t.failure(input, context, PROJECT_ROUTINGS_EMPTY_MESSAGE);
    }

    if (input.length > MAX_PROJECT_ROUTINGS_LENGTH) {
      return t.failure(input, context, PROJECT_ROUTINGS_TOO_LONG_MESSAGE);
    }

    return t.success(input);
  },
  t.identity
);

const settingsSchema = t.intersection([
  t.type({
    syncDelay: durationType,
    frequency: durationType,
    preventInitialBackfill: t.boolean,
  }),
  t.partial({
    syncField: t.union([t.string, t.null]),
    /** @deprecated use projectRoutings */
    preventCrossProjectSearch: t.boolean,
    projectRoutings: t.union([boundedProjectRoutingSchema, t.null]),
  }),
]);

const groupBySchema = allOrAnyStringOrArray;

const optionalSettingsSchema = t.partial({
  syncDelay: durationType,
  frequency: durationType,
  preventInitialBackfill: t.boolean,
  /** @deprecated use projectRoutings */
  preventCrossProjectSearch: t.boolean,
  projectRoutings: t.union([boundedProjectRoutingSchema, t.null]),
  syncField: t.union([t.string, t.null]),
});

const tagsSchema = t.array(t.string);

// id cannot contain special characters and spaces
const sloIdSchema = new t.Type<string, string, unknown>(
  'sloIdSchema',
  t.string.is,
  (input, context): Either<t.Errors, string> => {
    if (typeof input === 'string') {
      const valid = isValidId(input);
      if (!valid) {
        return t.failure(input, context, SLO_ID_INVALID_MESSAGE);
      }

      return t.success(input);
    } else {
      return t.failure(input, context);
    }
  },
  t.identity
);

function isValidId(id: string): boolean {
  const validLength = MIN_SLO_ID_LENGTH <= id.length && id.length <= MAX_SLO_ID_LENGTH;
  return validLength && SLO_ID_REGEX.test(id);
}

const requiredSloFields = t.type({
  id: sloIdSchema,
  name: t.string,
  description: t.string,
  indicator: indicatorSchema,
  timeWindow: timeWindowSchema,
  budgetingMethod: budgetingMethodSchema,
  objective: objectiveSchema,
  settings: settingsSchema,
  revision: t.number,
  enabled: t.boolean,
  tags: tagsSchema,
  createdAt: dateType,
  updatedAt: dateType,
  groupBy: groupBySchema,
  version: t.number,
});

const optionalSloFields = t.partial({
  createdBy: t.string,
  updatedBy: t.string,
});

const baseSloSchema = t.intersection([requiredSloFields, optionalSloFields]);

const dashboardsWithIdSchema = t.partial({ dashboards: t.array(t.type({ id: t.string })) });
const dashboardsWithRefIdSchema = t.partial({ dashboards: t.array(t.type({ refId: t.string })) });

const artifactsWithIdSchema = t.partial({ artifacts: dashboardsWithIdSchema });
const artifactsWithRefIdSchema = t.partial({ artifacts: dashboardsWithRefIdSchema });

const sloDefinitionSchema = t.intersection([baseSloSchema, artifactsWithIdSchema]);
const storedSloDefinitionSchema = t.intersection([baseSloSchema, artifactsWithRefIdSchema]);

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
