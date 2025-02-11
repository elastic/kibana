/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBodyForEventAction } from './helpers';
import { mappings } from './mocks';

describe('Create Record Mapping', () => {
  const appId = '45678';

  test('it maps successfully', () => {
    const params = {
      alertId: 'al123',
      ruleName: 'Rule Name',
      severity: 'Critical',
      caseName: 'Case Name',
      caseId: 'es3456789',
      description: 'case desc',
      externalId: null,
    };

    const data = getBodyForEventAction(appId, mappings, params);
    expect(data.applicationId).toEqual(appId);
    expect(data.id).not.toBeDefined();
    expect(data.values?.[mappings.alertIdConfig?.id ?? 0]).toEqual(params.alertId);
    expect(data.values?.[mappings.ruleNameConfig.id]).toEqual(params.ruleName);
    expect(data.values?.[mappings.caseNameConfig?.id ?? 0]).toEqual(params.caseName);
    expect(data.values?.[mappings.caseIdConfig?.id ?? 0]).toEqual(params.caseId);
    expect(data.values?.[mappings?.severityConfig?.id ?? 0]).toEqual(params.severity);
    expect(data.values?.[mappings?.descriptionConfig?.id ?? 0]).toEqual(params.description);
  });

  test('it contains the id if defined', () => {
    const params = {
      alertId: 'al123',
      ruleName: 'Rule Name',
      severity: 'Critical',
      caseName: 'Case Name',
      caseId: 'es3456789',
      description: 'case desc',
      externalId: null,
    };
    const data = getBodyForEventAction(appId, mappings, params, '123');
    expect(data.id).toEqual('123');
  });

  test('it does not includes null mappings', () => {
    const params = {
      alertId: 'al123',
      ruleName: 'Rule Name',
      severity: 'Critical',
      caseName: 'Case Name',
      caseId: 'es3456789',
      description: 'case desc',
      externalId: null,
    };

    // @ts-expect-error
    const data = getBodyForEventAction(appId, { ...mappings, test: null }, params);
    expect(data.values?.test).not.toBeDefined();
  });

  test('it converts a numeric values correctly', () => {
    const params = {
      alertId: 'thisIsNotANumber',
      ruleName: 'Rule Name',
      severity: 'Critical',
      caseName: 'Case Name',
      caseId: '123',
      description: 'case desc',
      externalId: null,
    };

    const data = getBodyForEventAction(
      appId,
      {
        ...mappings,
        caseIdConfig: { ...mappings.caseIdConfig, fieldType: 'numeric' },
        alertIdConfig: { ...mappings.alertIdConfig, fieldType: 'numeric' },
      },
      params
    );

    expect(data.values?.[mappings.alertIdConfig?.id ?? 0]).toBe(0);
    expect(data.values?.[mappings.caseIdConfig?.id ?? 0]).toBe(123);
  });
});
