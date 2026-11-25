/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
} from '@kbn/alerting-types';
import {
  normalizeExecutionStatusErrorReason,
  normalizeLastRunWarning,
} from './normalize_rule_execution_reasons';

describe('normalizeExecutionStatusErrorReason', () => {
  it.each(Object.values(RuleExecutionStatusErrorReasons))('keeps known reason %s', (reason) => {
    expect(normalizeExecutionStatusErrorReason(reason)).toBe(reason);
  });

  it('maps a reason from a newer Kibana to unknown', () => {
    expect(normalizeExecutionStatusErrorReason('reason-from-the-future')).toBe(
      RuleExecutionStatusErrorReasons.Unknown
    );
  });

  it('does not accept warning reasons as error reasons', () => {
    expect(normalizeExecutionStatusErrorReason(RuleExecutionStatusWarningReasons.MAX_ALERTS)).toBe(
      RuleExecutionStatusErrorReasons.Unknown
    );
  });
});

describe('normalizeLastRunWarning', () => {
  it.each([
    ...Object.values(RuleExecutionStatusErrorReasons),
    ...Object.values(RuleExecutionStatusWarningReasons),
  ])('keeps known reason %s', (reason) => {
    expect(normalizeLastRunWarning(reason)).toBe(reason);
  });

  it('maps a warning from a newer Kibana to unknown', () => {
    expect(normalizeLastRunWarning('reason-from-the-future')).toBe(
      RuleExecutionStatusErrorReasons.Unknown
    );
  });

  it('keeps null', () => {
    expect(normalizeLastRunWarning(null)).toBeNull();
  });
});
