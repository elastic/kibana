/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TEST_CONNECTOR_SUB_ACTION } from '@kbn/connector-specs';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ActionType } from '../../types';
import { getSpecConnectorTestExecutionParams } from './get_spec_connector_test_execution_params';

describe('getSpecConnectorTestExecutionParams', () => {
  const specActionType = {
    id: 'spec-connector',
    name: 'Spec',
    enabled: true,
    source: ACTION_TYPE_SOURCES.spec,
    testable: true,
  } as ActionType;

  it('seeds __test__ subAction for opted-in spec connectors', () => {
    expect(getSpecConnectorTestExecutionParams(specActionType, {})).toEqual({
      subAction: TEST_CONNECTOR_SUB_ACTION,
      subActionParams: {},
    });
  });

  it('returns params unchanged when subAction is already set', () => {
    const params = { subAction: 'run', subActionParams: { foo: 'bar' } };
    expect(getSpecConnectorTestExecutionParams(specActionType, params)).toBe(params);
  });

  it('returns params unchanged for stack connectors', () => {
    const stackActionType = {
      ...specActionType,
      source: ACTION_TYPE_SOURCES.stack,
    } as ActionType;

    expect(getSpecConnectorTestExecutionParams(stackActionType, {})).toEqual({});
  });
});
