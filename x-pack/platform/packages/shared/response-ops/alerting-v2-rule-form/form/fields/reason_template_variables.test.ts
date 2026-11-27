/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildReasonTemplateVariables } from './reason_template_variables';

describe('buildReasonTemplateVariables', () => {
  it('offers the rule fields when the query has no columns yet', () => {
    expect(buildReasonTemplateVariables([]).map(({ expression }) => expression)).toEqual([
      'rule.id',
      'rule.name',
      'rule.description',
      'rule.tags',
      'rule.version',
    ]);
  });

  it('offers each output column under data, with its type as detail', () => {
    const variables = buildReasonTemplateVariables([
      { name: 'host.name', type: 'keyword' },
      { name: '@timestamp', type: 'date' },
    ]);

    expect(variables.slice(0, 2)).toEqual([
      { expression: 'data.host.name', detail: 'keyword' },
      { expression: 'data.@timestamp', detail: 'date' },
    ]);
  });

  it('uses bracket access for a column that dot access cannot read', () => {
    const variables = buildReasonTemplateVariables([
      { name: 'avg cpu', type: 'double' },
      { name: 'count-1', type: 'long' },
    ]);

    expect(variables.slice(0, 2).map(({ expression }) => expression)).toEqual([
      'data["avg cpu"]',
      'data["count-1"]',
    ]);
  });
});
