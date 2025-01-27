/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

const ALLOW_FIELDS = [
  'alert.attributes.executionStatus.status',
  'alert.attributes.lastRun.outcome',
  'alert.attributes.muteAll',
  'alert.attributes.tags',
  'alert.attributes.snoozeSchedule',
  'alert.attributes.snoozeSchedule.duration',
  'alert.attributes.alertTypeId',
  'alert.attributes.enabled',
  'alert.attributes.params.*', // TODO: https://github.com/elastic/kibana/issues/159602
  'alert.attributes.params.immutable', // TODO: Remove after addressing https://github.com/elastic/kibana/issues/159602
];

const ALLOW_AGG_TYPES = ['terms', 'composite', 'nested', 'filter'];

const AGG_TYPES_TO_VERIFY = ['field', 'path'];

const AGG_KEYS = ['aggs', 'aggregations'];

export const validateRuleAggregationFields = (
  aggs: Record<string, AggregationsAggregationContainer>
) => {
  Object.values(aggs).forEach((aggContainer) => {
    // validate root level aggregation types (non aggs/aggregations)
    validateTypes(aggContainer);

    // Recursively go through aggs to validate terms
    if (aggContainer.aggs) {
      validateRuleAggregationFields(aggContainer.aggs);
    }
    if (aggContainer.aggregations) {
      validateRuleAggregationFields(aggContainer.aggregations);
    }
  });
};

const validateTypes = (container: AggregationsAggregationContainer) => {
  Object.entries(container).forEach(([aggType, aggContainer]) => {
    // Do not try to validate aggs/aggregations, as the above function is already doing that
    if (AGG_KEYS.includes(aggType)) {
      return;
    }

    if (!ALLOW_AGG_TYPES.includes(aggType)) {
      throw Boom.badRequest(`Invalid aggregation type: ${aggType}`);
    }

    validateFields(aggContainer);
  });
};

const validateFields = (container: AggregationsAggregationContainer) => {
  Object.entries(container).forEach(([aggType, aggContainer]) => {
    // Found field, check field against blocklist
    if (AGG_TYPES_TO_VERIFY.includes(aggType) && !ALLOW_FIELDS.includes(aggContainer)) {
      throw Boom.badRequest(`Invalid aggregation term: ${aggContainer}`);
    }

    // Did not find anything, keep recursing if possible
    if (typeof aggContainer === 'object' && aggContainer !== null && !Array.isArray(aggContainer)) {
      validateFields(aggContainer);
    }
  });
};
