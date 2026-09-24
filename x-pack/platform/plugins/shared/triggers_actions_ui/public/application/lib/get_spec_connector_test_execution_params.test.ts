/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TEST_CONNECTOR_SUB_ACTION } from '@kbn/connector-specs';
import { getSpecConnectorTestExecutionParams } from './get_spec_connector_test_execution_params';

describe('getSpecConnectorTestExecutionParams', () => {
  it('seeds _test subAction for opted-in spec connectors', () => {
    expect(getSpecConnectorTestExecutionParams({}, { isSpec: true, isTestable: true })).toEqual({
      subAction: TEST_CONNECTOR_SUB_ACTION,
      subActionParams: {},
    });
  });

  it('returns params unchanged for spec connectors that are not testable', () => {
    expect(getSpecConnectorTestExecutionParams({}, { isSpec: true, isTestable: false })).toEqual(
      {}
    );
  });

  it('returns params unchanged when subAction is already set', () => {
    const params = { subAction: 'run', subActionParams: { foo: 'bar' } };
    expect(getSpecConnectorTestExecutionParams(params, { isSpec: true, isTestable: true })).toBe(
      params
    );
  });

  it('returns params unchanged for stack connectors', () => {
    expect(getSpecConnectorTestExecutionParams({}, { isSpec: false, isTestable: true })).toEqual(
      {}
    );
  });
});
