/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyParamsPatch, checkBuilderParams } from './builder_params';
import { thresholdRuleBuilderType } from './threshold/definition';
import { Aggregation, Comparator } from './threshold/form_types';
import type { ThresholdParams } from './threshold/params_schema';

const params: ThresholdParams = {
  indexPattern: 'logs-*',
  timeField: '@timestamp',
  filterQuery: 'service.name == "api"',
  stats: [{ label: 'count', aggregation: Aggregation.COUNT }],
  evaluations: [],
  alertConditions: [{ metric: 'count', comparator: Comparator.GT, threshold: [100] }],
  conditionOperator: 'AND',
  groupByFields: ['host.name'],
};

describe('applyParamsPatch', () => {
  it('keeps every field when the patch is empty', () => {
    expect(applyParamsPatch(params, {})).toEqual(params);
  });

  it('replaces arrays wholesale instead of merging them', () => {
    expect(applyParamsPatch(params, { groupByFields: ['service.name'] }).groupByFields).toEqual([
      'service.name',
    ]);
  });

  it('removes fields set to null and ignores undefined ones', () => {
    const next = applyParamsPatch(params, { filterQuery: null, indexPattern: undefined });

    expect(next).not.toHaveProperty('filterQuery');
    expect(next.indexPattern).toBe('logs-*');
  });

  it('does not mutate the current params', () => {
    applyParamsPatch(params, { filterQuery: null });

    expect(params.filterQuery).toBe('service.name == "api"');
  });
});

describe('checkBuilderParams', () => {
  it('returns the parsed params, with defaults applied, when they are valid', () => {
    const { evaluations, conditionOperator, groupByFields, ...required } = params;

    expect(checkBuilderParams(thresholdRuleBuilderType, required)).toEqual({
      valid: true,
      params: { ...required, evaluations: [], conditionOperator: 'AND', groupByFields: [] },
    });
  });

  it('reports schema issues with their path', () => {
    expect(checkBuilderParams(thresholdRuleBuilderType, { ...params, stats: [] })).toEqual({
      valid: false,
      errors: [expect.stringMatching(/^stats: /)],
    });
  });

  it("reports the builder's own validation errors", () => {
    expect(
      checkBuilderParams(thresholdRuleBuilderType, {
        ...params,
        alertConditions: [{ metric: 'missing', comparator: Comparator.GT, threshold: [1] }],
      })
    ).toEqual({
      valid: false,
      errors: [
        'Alert condition metric "missing" is not a stat or evaluation label. Available labels: count.',
      ],
    });
  });
});
