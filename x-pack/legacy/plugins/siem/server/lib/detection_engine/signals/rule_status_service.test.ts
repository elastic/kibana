/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildRuleStatusAttributes } from './rule_status_service';

const expectIsoDateString = expect.stringMatching(/Z$/);

describe('buildRuleStatusAttributes', () => {
  it('generates a new date on each call', async () => {
    const { statusDate } = buildRuleStatusAttributes('going to run');
    const { statusDate: statusDate2 } = buildRuleStatusAttributes('going to run');

    expect(statusDate).toEqual(expectIsoDateString);
    await new Promise(resolve => setTimeout(resolve, 10)); // ensure time has passed
    expect(statusDate2).toEqual(expectIsoDateString);
    expect(statusDate).toEqual(statusDate2);
  });

  it('returns a status and statusDate if "going to run"', () => {
    const result = buildRuleStatusAttributes('going to run');
    expect(result).toEqual({
      status: 'going to run',
      statusDate: expectIsoDateString,
    });
  });

  it('returns success fields if "success"', () => {
    const result = buildRuleStatusAttributes('succeeded', 'success message');
    expect(result).toEqual({
      status: 'succeeded',
      statusDate: expectIsoDateString,
      lastSuccessAt: expectIsoDateString,
      lastSuccessMessage: 'success message',
    });

    expect(result.statusDate).toEqual(result.lastSuccessAt);
  });

  it('returns failure fields if "failed"', () => {
    const result = buildRuleStatusAttributes('failed', 'failure message');
    expect(result).toEqual({
      status: 'failed',
      statusDate: expectIsoDateString,
      lastFailureAt: expectIsoDateString,
      lastFailureMessage: 'failure message',
    });

    expect(result.statusDate).toEqual(result.lastFailureAt);
  });
});
