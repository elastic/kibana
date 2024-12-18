/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';

import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useGetChoices } from './use_get_choices';
import { getChoices } from './api';

jest.mock('./api');
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const getChoicesMock = getChoices as jest.Mock;
const onSuccess = jest.fn();

const actionConnector = {
  secrets: {
    username: 'user',
    password: 'pass',
  },
  id: 'test',
  actionTypeId: '.servicenow',
  name: 'ServiceNow ITSM',
  isPreconfigured: false,
  isSystemAction: false as const,
  isDeprecated: false,
  config: {
    apiUrl: 'https://dev94428.service-now.com/',
  },
} as ActionConnector;

const getChoicesResponse = [
  {
    dependent_value: '',
    label: 'Priviledge Escalation',
    value: 'Priviledge Escalation',
    element: 'category',
  },
  {
    dependent_value: '',
    label: 'Criminal activity/investigation',
    value: 'Criminal activity/investigation',
    element: 'category',
  },
  {
    dependent_value: '',
    label: 'Denial of Service',
    value: 'Denial of Service',
    element: 'category',
  },
];

describe('useGetChoices', () => {
  const { services } = useKibanaMock();
  getChoicesMock.mockResolvedValue({
    data: getChoicesResponse,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const fields = ['priority'];

  it('init', async () => {
    const { result } = renderHook(() =>
      useGetChoices({
        http: services.http,
        actionConnector,
        toastNotifications: services.notifications.toasts,
        fields,
        onSuccess,
      })
    );

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        choices: getChoicesResponse,
      })
    );
  });

  it('returns an empty array when connector is not presented', async () => {
    const { result } = renderHook(() =>
      useGetChoices({
        http: services.http,
        actionConnector: undefined,
        toastNotifications: services.notifications.toasts,
        fields,
        onSuccess,
      })
    );

    expect(result.current).toEqual({
      isLoading: false,
      choices: [],
    });
  });

  it('it calls onSuccess', async () => {
    renderHook(() =>
      useGetChoices({
        http: services.http,
        actionConnector,
        toastNotifications: services.notifications.toasts,
        fields,
        onSuccess,
      })
    );

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(getChoicesResponse));
  });

  it('it displays an error when service fails', async () => {
    getChoicesMock.mockResolvedValue({
      status: 'error',
      serviceMessage: 'An error occurred',
    });

    renderHook(() =>
      useGetChoices({
        http: services.http,
        actionConnector,
        toastNotifications: services.notifications.toasts,
        fields,
        onSuccess,
      })
    );

    await waitFor(() =>
      expect(services.notifications.toasts.addDanger).toHaveBeenCalledWith({
        text: 'An error occurred',
        title: 'Unable to get choices',
      })
    );
  });

  it('it displays an error when http throws an error', async () => {
    getChoicesMock.mockImplementation(() => {
      throw new Error('An error occurred');
    });

    renderHook(() =>
      useGetChoices({
        http: services.http,
        actionConnector,
        toastNotifications: services.notifications.toasts,
        fields,
        onSuccess,
      })
    );

    await waitFor(() =>
      expect(services.notifications.toasts.addDanger).toHaveBeenCalledWith({
        text: 'An error occurred',
        title: 'Unable to get choices',
      })
    );
  });

  it('returns an empty array if the response is not an array', async () => {
    getChoicesMock.mockResolvedValue({
      status: 'ok',
      data: {},
    });

    const { result } = renderHook(() =>
      useGetChoices({
        http: services.http,
        actionConnector: undefined,
        toastNotifications: services.notifications.toasts,
        fields,
        onSuccess,
      })
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        isLoading: false,
        choices: [],
      });
    });
  });
});
