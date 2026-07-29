/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildV1AuthzWhereExpression,
  hasAuthorizedClassicAlertTypes,
} from './build_v1_authz_where';

describe('hasAuthorizedClassicAlertTypes', () => {
  it('is false when authz is missing or empty', () => {
    expect(hasAuthorizedClassicAlertTypes(null)).toBe(false);
    expect(hasAuthorizedClassicAlertTypes(undefined)).toBe(false);
    expect(hasAuthorizedClassicAlertTypes(new Map())).toBe(false);
  });

  it('is false when rule types have no consumers', () => {
    expect(
      hasAuthorizedClassicAlertTypes(new Map([['empty.type', { authorizedConsumers: {} }]]))
    ).toBe(false);
  });

  it('is true when at least one rule type has consumers', () => {
    expect(
      hasAuthorizedClassicAlertTypes(
        new Map([['apm.anomaly', { authorizedConsumers: { apm: {} } }]])
      )
    ).toBe(true);
  });
});

describe('buildV1AuthzWhereExpression', () => {
  it('allows only v2 rows when no authorized rule types are provided', () => {
    expect(buildV1AuthzWhereExpression(null)).toBe('`kibana.alert.rule.rule_type_id` IS NULL');
    expect(buildV1AuthzWhereExpression(undefined)).toBe('`kibana.alert.rule.rule_type_id` IS NULL');
    expect(buildV1AuthzWhereExpression(new Map())).toBe('`kibana.alert.rule.rule_type_id` IS NULL');
  });

  it('ORs authorized rule type / consumer pairs and always allows v2 rows', () => {
    const authorized = new Map([
      ['apm.anomaly', { authorizedConsumers: { apm: {}, alerts: {} } }],
      ['.es-query', { authorizedConsumers: { stackAlerts: {} } }],
    ]);

    const expression = buildV1AuthzWhereExpression(authorized);

    expect(expression).toContain('`kibana.alert.rule.rule_type_id` IS NULL OR');
    expect(expression).toContain('`kibana.alert.rule.rule_type_id` == "apm.anomaly"');
    expect(expression).toContain('`kibana.alert.rule.consumer` IN ("apm", "alerts")');
    expect(expression).toContain('`kibana.alert.rule.rule_type_id` == ".es-query"');
    expect(expression).toContain('`kibana.alert.rule.consumer` == "stackAlerts"');
  });

  it('skips rule types with no authorized consumers', () => {
    const authorized = new Map([['empty.type', { authorizedConsumers: {} }]]);
    expect(buildV1AuthzWhereExpression(authorized)).toBe(
      '`kibana.alert.rule.rule_type_id` IS NULL'
    );
  });
});
