/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/Either';
import { allOrAnyStringOrArray, dateType } from './common';
import { durationType } from './duration';
import { indicatorSchema } from './indicators';
import { timeWindowSchema } from './time_window';

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

const settingsSchema = t.type({
  syncDelay: durationType,
  frequency: durationType,
  preventInitialBackfill: t.boolean,
});

const groupBySchema = allOrAnyStringOrArray;

const optionalSettingsSchema = t.partial({ ...settingsSchema.props });
const tagsSchema = t.array(t.string);
// id cannot contain special characters and spaces
const sloIdSchema = new t.Type<string, string, unknown>(
  'sloIdSchema',
  t.string.is,
  (input, context): Either<t.Errors, string> => {
    if (typeof input === 'string') {
      const valid = isValidId(input);
      if (!valid) {
        return t.failure(
          input,
          context,
          'Invalid slo id, must be between 8 and 48 characters and contain only letters, numbers, hyphens, and underscores'
        );
      }

      return t.success(input);
    } else {
      return t.failure(input, context);
    }
  },
  t.identity
);

function isValidId(id: string): boolean {
  const MIN_ID_LENGTH = 8;
  const MAX_ID_LENGTH = 48;
  const validLength = MIN_ID_LENGTH <= id.length && id.length <= MAX_ID_LENGTH;
  return validLength && /^[a-z0-9-_]+$/.test(id);
}

const sloDefinitionSchema = t.type({
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

export {
  budgetingMethodSchema,
  objectiveSchema,
  groupBySchema,
  occurrencesBudgetingMethodSchema,
  optionalSettingsSchema,
  settingsSchema,
  sloDefinitionSchema,
  sloIdSchema,
  tagsSchema,
  targetSchema,
  timeslicesBudgetingMethodSchema,
};
