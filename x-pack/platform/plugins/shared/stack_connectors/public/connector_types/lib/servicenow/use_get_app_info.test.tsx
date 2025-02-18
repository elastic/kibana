/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { useGetAppInfo } from './use_get_app_info';
import { getAppInfo } from './api';
import { ServiceNowActionConnector } from './types';
import { httpServiceMock } from '@kbn/core/public/mocks';

jest.mock('./api');
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

const getAppInfoMock = getAppInfo as jest.Mock;

const actionTypeId = '.servicenow';
const applicationInfoData = {
  name: 'Elastic',
  scope: 'x_elas2_inc_int',
  version: '1.0.0',
};

const actionConnector = {
  secrets: {
    username: 'user',
    password: 'pass',
  },
  id: 'test',
  actionTypeId: '.servicenow',
  name: 'ServiceNow ITSM',
  isPreconfigured: false,
  isDeprecated: false,
  config: {
    apiUrl: 'https://test.service-now.com/',
    usesTableApi: false,
  },
} as ServiceNowActionConnector;

describe('useGetAppInfo', () => {
  const http = httpServiceMock.createStartContract();

  getAppInfoMock.mockResolvedValue(applicationInfoData);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    const { result } = renderHook(() =>
      useGetAppInfo({
        actionTypeId,
        http,
      })
    );

    expect(result.current).toEqual({
      isLoading: false,
      fetchAppInfo: result.current.fetchAppInfo,
    });
  });

  it('returns the application information', async () => {
    const { result } = renderHook(() =>
      useGetAppInfo({
        actionTypeId,
        http,
      })
    );

    let res;

    await act(async () => {
      res = await result.current.fetchAppInfo(actionConnector);
    });

    expect(res).toEqual(applicationInfoData);
  });

  it('it throws an error when api fails', async () => {
    expect.assertions(1);
    getAppInfoMock.mockImplementation(() => {
      throw new Error('An error occurred');
    });

    const { result } = renderHook(() =>
      useGetAppInfo({
        actionTypeId,
        http,
      })
    );

    await expect(() =>
      act(async () => {
        await result.current.fetchAppInfo(actionConnector);
      })
    ).rejects.toThrow('An error occurred');
  });

  it('it throws an error when fetch fails', async () => {
    expect.assertions(1);
    getAppInfoMock.mockImplementation(() => {
      const error = new Error('An error occurred');
      error.name = 'TypeError';
      throw error;
    });

    const { result } = renderHook(() =>
      useGetAppInfo({
        actionTypeId,
        http,
      })
    );

    await expect(() =>
      act(async () => {
        await result.current.fetchAppInfo(actionConnector);
      })
    ).rejects.toThrow(
      'Failed to fetch. Check the URL or the CORS configuration of your ServiceNow instance.'
    );
  });
});
