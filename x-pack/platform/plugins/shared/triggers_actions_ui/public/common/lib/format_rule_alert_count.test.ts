/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatRuleAlertCount } from './format_rule_alert_count';

describe('formatRuleAlertCount', () => {
  it('returns value if version is undefined', () => {
    expect(formatRuleAlertCount('0')).toEqual('0');
  });

  it('renders zero value if version is greater than or equal to 8.3.0', () => {
    expect(formatRuleAlertCount('0', '8.3.0')).toEqual('0');
  });

  it('renders non-zero value if version is greater than or equal to 8.3.0', () => {
    expect(formatRuleAlertCount('4', '8.3.0')).toEqual('4');
  });

  it('renders dashes for zero value if version is less than 8.3.0', () => {
    expect(formatRuleAlertCount('0', '8.2.9')).toEqual('--');
  });

  it('renders non-zero value event if version is less than to 8.3.0', () => {
    expect(formatRuleAlertCount('5', '8.2.9')).toEqual('5');
  });

  it('renders as is if value is unexpectedly not an integer', () => {
    expect(formatRuleAlertCount('yo', '8.2.9')).toEqual('yo');
  });
});
