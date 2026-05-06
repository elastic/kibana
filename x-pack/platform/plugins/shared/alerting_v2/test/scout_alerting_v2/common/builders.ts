/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRuleData } from '@kbn/alerting-v2-schemas';

const DEFAULT_METADATA: CreateRuleData['metadata'] = { name: 'scout-rule' };

const DEFAULT_EVALUATION: CreateRuleData['evaluation'] = {
  query: { base: 'FROM logs-* | LIMIT 10' },
};

const DEFAULT_SCHEDULE: CreateRuleData['schedule'] = { every: '5m' };

const DEFAULT_TIME_FIELD: CreateRuleData['time_field'] = '@timestamp';

export type BuildCreateRuleDataInput = Partial<CreateRuleData>;

export const buildCreateRuleData = (input: BuildCreateRuleDataInput = {}): CreateRuleData => {
  const {
    kind = 'alert',
    metadata = DEFAULT_METADATA,
    schedule = DEFAULT_SCHEDULE,
    evaluation = DEFAULT_EVALUATION,
    time_field = DEFAULT_TIME_FIELD,
    ...rest
  } = input;
  return { kind, metadata, schedule, evaluation, time_field, ...rest };
};
