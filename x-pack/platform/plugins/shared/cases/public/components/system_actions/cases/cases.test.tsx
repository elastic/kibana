/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { MAX_OPEN_CASES_DEFAULT_MAXIMUM } from '../../../../common/constants';
import { getConnectorType } from './cases';
import { MAX_CASES_TO_OPEN_ERROR } from './translations';
import { KibanaServices } from '../../../common/lib/kibana';

jest.mock('../../../common/lib/kibana');

const CONNECTOR_TYPE_ID = '.cases';
const MAX_CASES_ERROR_MESSAGE = MAX_CASES_TO_OPEN_ERROR(MAX_OPEN_CASES_DEFAULT_MAXIMUM);
let connectorTypeModel: ActionTypeModel;
const mockKibanaServices = jest.mocked(KibanaServices);

beforeAll(() => {
  connectorTypeModel = getConnectorType();
});

beforeEach(() => {
  mockKibanaServices.get.mockReturnValue({
    uiSettings: {
      get: jest.fn().mockReturnValue(MAX_OPEN_CASES_DEFAULT_MAXIMUM),
    },
  } as never);
});

describe('has correct connector id', () => {
  test('connector type static data is as expected', () => {
    expect(connectorTypeModel.id).toEqual(CONNECTOR_TYPE_ID);
  });
});

describe('action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      subActionParams: {
        timeWindow: '7d',
        reopenClosedCases: false,
        groupingBy: [],
        owner: 'cases',
      },
    };

    expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
      errors: { timeWindow: [], maximumCasesToOpen: [] },
    });
  });

  test('params validation succeeds when valid timeWindow', async () => {
    const actionParams = { subActionParams: { timeWindow: '17w' } };

    expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
      errors: { timeWindow: [], maximumCasesToOpen: [] },
    });
  });

  test('params validation fails when timeWindow is empty', async () => {
    const actionParams = { subActionParams: { timeWindow: '' } };

    expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
      errors: { timeWindow: ['Invalid time window.'], maximumCasesToOpen: [] },
    });
  });

  test('params validation fails when timeWindow is undefined', async () => {
    const actionParams = { subActionParams: { timeWindow: undefined } };

    expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
      errors: { timeWindow: ['Invalid time window.'], maximumCasesToOpen: [] },
    });
  });

  test('params validation fails when timeWindow is null', async () => {
    const actionParams = { subActionParams: { timeWindow: null } };

    expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
      errors: { timeWindow: ['Invalid time window.'], maximumCasesToOpen: [] },
    });
  });

  test('params validation fails when timeWindow size is 0', async () => {
    const actionParams = { subActionParams: { timeWindow: '0d' } };

    expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
      errors: { timeWindow: ['Invalid time window.'], maximumCasesToOpen: [] },
    });
  });

  test('params validation fails when timeWindow size is negative', async () => {
    const actionParams = { subActionParams: { timeWindow: '-5w' } };

    expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
      errors: { timeWindow: ['Invalid time window.'], maximumCasesToOpen: [] },
    });
  });

  test('params validation fails when timeWindow is less than 5 minutes', async () => {
    const actionParams = { subActionParams: { timeWindow: '3m' } };
    expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
      errors: { timeWindow: ['Time window should be at least 5 minutes'], maximumCasesToOpen: [] },
    });
  });

  test('params validation succeeds when maximumCasesToOpen is within bounds', async () => {
    const actionParams = { subActionParams: { timeWindow: '7d', maximumCasesToOpen: 10 } };

    expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
      errors: { timeWindow: [], maximumCasesToOpen: [] },
    });
  });

  test('params validation fails when maximumCasesToOpen is less than 1', async () => {
    const actionParams = { subActionParams: { timeWindow: '7d', maximumCasesToOpen: 0 } };

    expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
      errors: { timeWindow: [], maximumCasesToOpen: [MAX_CASES_ERROR_MESSAGE] },
    });
  });

  test('params validation fails when maximumCasesToOpen exceeds the limit', async () => {
    const actionParams = {
      subActionParams: { timeWindow: '7d', maximumCasesToOpen: MAX_OPEN_CASES_DEFAULT_MAXIMUM + 1 },
    };

    expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
      errors: { timeWindow: [], maximumCasesToOpen: [MAX_CASES_ERROR_MESSAGE] },
    });
  });

  test('params validation uses the configured advanced setting ceiling', async () => {
    mockKibanaServices.get.mockReturnValue({
      uiSettings: {
        get: jest.fn().mockReturnValue(30),
      },
    } as never);

    expect(
      await connectorTypeModel.validateParams(
        { subActionParams: { timeWindow: '7d', maximumCasesToOpen: 31 } },
        null
      )
    ).toEqual({
      errors: { timeWindow: [], maximumCasesToOpen: [MAX_CASES_TO_OPEN_ERROR(30)] },
    });
  });
});
