/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syntheticsMonitorStatusRuleParamsSchema } from './v1';

describe('syntheticsMonitorStatusRuleParamsSchema', () => {
  it('accepts a down threshold within the number of checks', () => {
    expect(() =>
      syntheticsMonitorStatusRuleParamsSchema.validate({
        condition: { downThreshold: 3, window: { numberOfChecks: 5 } },
      })
    ).not.toThrow();
  });

  it('accepts a down threshold equal to the number of checks', () => {
    expect(() =>
      syntheticsMonitorStatusRuleParamsSchema.validate({
        condition: { downThreshold: 5, window: { numberOfChecks: 5 } },
      })
    ).not.toThrow();
  });

  it('rejects a down threshold greater than the number of checks', () => {
    expect(() =>
      syntheticsMonitorStatusRuleParamsSchema.validate({
        condition: { downThreshold: 5, window: { numberOfChecks: 1 } },
      })
    ).toThrowError(/cannot be greater than the number of checks/);
  });

  it('does not constrain the down threshold for time window conditions', () => {
    expect(() =>
      syntheticsMonitorStatusRuleParamsSchema.validate({
        condition: { downThreshold: 50, window: { time: { unit: 'm', size: 5 } } },
      })
    ).not.toThrow();
  });
});
