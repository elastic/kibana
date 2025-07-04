/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, renderHook } from '@testing-library/react';

import { usePushToService } from '.';
import { noPushCasesPermissions, readCasesPermissions, TestProviders } from '../../common/mock';
import { usePostPushToService } from '../../containers/use_post_push_to_service';
import { actionLicenses } from '../../containers/mock';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { getCaseConnectorsMockResponse } from '../../common/mock/connectors';
import { useRefreshCaseViewPage } from '../case_view/use_on_refresh_case_view_page';
import { CaseStatuses, ConnectorTypes } from '../../../common/types/domain';
import type { CaseConnector } from '../../../common/types/domain';

jest.mock('../../containers/use_get_action_license', () => {
  return {
    useGetActionLicense: jest.fn(),
  };
});
jest.mock('../../containers/use_post_push_to_service');
jest.mock('../../containers/configure/api');
jest.mock('../../common/navigation/hooks');
jest.mock('../case_view/use_on_refresh_case_view_page');

const useFetchActionLicenseMock = useGetActionLicense as jest.Mock;
const usePostPushToServiceMock = usePostPushToService as jest.Mock;

describe('usePushToService', () => {
  const caseId = '12345';
  const pushCaseToExternalService = jest.fn().mockReturnValue({});
  const mockPostPush = {
    isLoading: false,
    mutateAsync: pushCaseToExternalService,
  };

  const caseConnectors = getCaseConnectorsMockResponse();
  const mockConnector = caseConnectors['jira-1'];
  const actionLicense = actionLicenses[0];

  const defaultArgs = {
    caseId,
    caseStatus: CaseStatuses.open,
    connector: {
      id: mockConnector.id,
      name: mockConnector.name,
      type: mockConnector.type,
      fields: mockConnector.fields,
    } as CaseConnector,
    caseConnectors,
    isValidConnector: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usePostPushToServiceMock.mockReturnValue(mockPostPush);
    useFetchActionLicenseMock.mockReturnValue({
      isLoading: false,
      data: actionLicense,
    });
  });

  it('calls pushCaseToExternalService with correct arguments', async () => {
    const { result } = renderHook(() => usePushToService(defaultArgs), {
      wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
    });

    await act(async () => {
      await result.current.handlePushToService();
    });

    expect(pushCaseToExternalService).toBeCalledWith({
      caseId,
      connector: defaultArgs.connector,
    });
  });

  it('Displays message when user does not have premium license', async () => {
    useFetchActionLicenseMock.mockImplementation(() => ({
      isLoading: false,
      data: {
        ...actionLicense,
        enabledInLicense: false,
      },
    }));

    const { result } = renderHook(() => usePushToService(defaultArgs), {
      wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
    });

    const errorsMsg = result.current.errorsMsg;
    expect(errorsMsg).toHaveLength(1);
    expect(errorsMsg[0].id).toEqual('license-error');
    expect(result.current.hasErrorMessages).toBe(true);
  });

  it('Displays message when user does not have case enabled in config', async () => {
    useFetchActionLicenseMock.mockImplementation(() => ({
      isLoading: false,
      data: {
        ...actionLicense,
        enabledInConfig: false,
      },
    }));

    const { result } = renderHook(() => usePushToService(defaultArgs), {
      wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
    });

    const errorsMsg = result.current.errorsMsg;
    expect(errorsMsg).toHaveLength(1);
    expect(errorsMsg[0].id).toEqual('kibana-config-error');
    expect(result.current.hasErrorMessages).toBe(true);
  });

  it('Displays message when user has select none as connector', async () => {
    const { result } = renderHook(
      () =>
        usePushToService({
          ...defaultArgs,
          connector: {
            id: 'none',
            name: 'none',
            type: ConnectorTypes.none,
            fields: null,
          },
        }),
      {
        wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
      }
    );

    const errorsMsg = result.current.errorsMsg;
    expect(errorsMsg).toHaveLength(1);
    expect(errorsMsg[0].id).toEqual('connector-missing-error');
    expect(result.current.hasErrorMessages).toBe(true);
  });

  it('Displays message when connector is deleted', async () => {
    const { result } = renderHook(
      () =>
        usePushToService({
          ...defaultArgs,
          connector: {
            id: 'not-exist',
            name: 'not-exist',
            type: ConnectorTypes.none,
            fields: null,
          },
          isValidConnector: false,
        }),
      {
        wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
      }
    );

    const errorsMsg = result.current.errorsMsg;
    expect(errorsMsg).toHaveLength(1);
    expect(errorsMsg[0].id).toEqual('connector-deleted-error');
    expect(result.current.hasErrorMessages).toBe(true);
  });

  it('should not call pushCaseToExternalService when the selected connector is none', async () => {
    const { result } = renderHook(
      () =>
        usePushToService({
          ...defaultArgs,
          connector: {
            id: 'none',
            name: 'none',
            type: ConnectorTypes.none,
            fields: null,
          },
        }),
      {
        wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
      }
    );

    await act(async () => {
      await result.current.handlePushToService();
    });

    expect(pushCaseToExternalService).not.toBeCalled();
  });

  it('refresh case view page after push', async () => {
    const { result } = renderHook(() => usePushToService(defaultArgs), {
      wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
    });

    await act(async () => {
      await result.current.handlePushToService();
    });

    await waitFor(() => {
      expect(useRefreshCaseViewPage()).toHaveBeenCalled();
    });
  });

  describe('user does not have write or push permissions', () => {
    it('returns correct information about push permissions', async () => {
      const { result } = renderHook(() => usePushToService(defaultArgs), {
        wrapper: ({ children }) => (
          <TestProviders permissions={noPushCasesPermissions()}> {children}</TestProviders>
        ),
      });

      expect(result.current.hasPushPermissions).toBe(false);
    });

    it('does not display a message when user does not have a premium license', async () => {
      useFetchActionLicenseMock.mockImplementation(() => ({
        isLoading: false,
        data: {
          ...actionLicense,
          enabledInLicense: false,
        },
      }));

      const { result } = renderHook(() => usePushToService(defaultArgs), {
        wrapper: ({ children }) => (
          <TestProviders permissions={readCasesPermissions()}> {children}</TestProviders>
        ),
      });

      expect(result.current.errorsMsg).toEqual([]);
      expect(result.current.hasErrorMessages).toBe(false);
    });

    it('does not display a message when user does not have case enabled in config', async () => {
      useFetchActionLicenseMock.mockImplementation(() => ({
        isLoading: false,
        data: {
          ...actionLicense,
          enabledInConfig: false,
        },
      }));

      const { result } = renderHook(() => usePushToService(defaultArgs), {
        wrapper: ({ children }) => (
          <TestProviders permissions={readCasesPermissions()}> {children}</TestProviders>
        ),
      });

      expect(result.current.errorsMsg).toEqual([]);
      expect(result.current.hasErrorMessages).toBe(false);
    });

    it('does not display a message when user does not have any connector configured', async () => {
      const { result } = renderHook(
        () =>
          usePushToService({
            ...defaultArgs,
            connector: {
              id: 'none',
              name: 'none',
              type: ConnectorTypes.none,
              fields: null,
            },
          }),
        {
          wrapper: ({ children }) => (
            <TestProviders permissions={readCasesPermissions()}> {children}</TestProviders>
          ),
        }
      );

      expect(result.current.errorsMsg).toEqual([]);
      expect(result.current.hasErrorMessages).toBe(false);
    });

    it('does not display a message when user does have a connector but is configured to none', async () => {
      const { result } = renderHook(
        () =>
          usePushToService({
            ...defaultArgs,
            connector: {
              id: 'none',
              name: 'none',
              type: ConnectorTypes.none,
              fields: null,
            },
          }),
        {
          wrapper: ({ children }) => (
            <TestProviders permissions={readCasesPermissions()}> {children}</TestProviders>
          ),
        }
      );

      expect(result.current.errorsMsg).toEqual([]);
      expect(result.current.hasErrorMessages).toBe(false);
    });

    it('does not display a message when connector is deleted', async () => {
      const { result } = renderHook(
        () =>
          usePushToService({
            ...defaultArgs,
            connector: {
              id: 'not-exist',
              name: 'not-exist',
              type: ConnectorTypes.none,
              fields: null,
            },
            isValidConnector: false,
          }),
        {
          wrapper: ({ children }) => (
            <TestProviders permissions={readCasesPermissions()}> {children}</TestProviders>
          ),
        }
      );

      expect(result.current.errorsMsg).toEqual([]);
      expect(result.current.hasErrorMessages).toBe(false);
    });

    it('does not display a message when case is closed', async () => {
      const { result } = renderHook(
        () =>
          usePushToService({
            ...defaultArgs,
            caseStatus: CaseStatuses.closed,
          }),
        {
          wrapper: ({ children }) => (
            <TestProviders permissions={readCasesPermissions()}> {children}</TestProviders>
          ),
        }
      );

      expect(result.current.errorsMsg).toEqual([]);
      expect(result.current.hasErrorMessages).toBe(false);
    });
  });

  describe('returned values', () => {
    it('initial', async () => {
      const { result } = renderHook(() => usePushToService(defaultArgs), {
        wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
      });

      const { handlePushToService, errorsMsg, ...rest } = result.current;

      expect(rest).toEqual({
        hasBeenPushed: true,
        hasErrorMessages: false,
        hasLicenseError: false,
        hasPushPermissions: true,
        isLoading: false,
        needsToBePushed: false,
      });
    });

    it('isLoading is true when usePostPushToService is loading', async () => {
      usePostPushToServiceMock.mockReturnValue({ ...mockPostPush, isLoading: true });

      const { result } = renderHook(() => usePushToService(defaultArgs), {
        wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('isLoading is true when loading license', async () => {
      useFetchActionLicenseMock.mockReturnValue({
        isLoading: true,
        data: actionLicense,
      });

      const { result } = renderHook(() => usePushToService(defaultArgs), {
        wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('hasErrorMessages=true if there are error messages', async () => {
      const { result } = renderHook(
        () => usePushToService({ ...defaultArgs, isValidConnector: false }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );

      expect(result.current.hasErrorMessages).toBe(true);
    });

    it('needsToBePushed=true if the connector needs to be pushed', async () => {
      const { result } = renderHook(
        () =>
          usePushToService({
            ...defaultArgs,
            caseConnectors: {
              ...caseConnectors,
              [mockConnector.id]: {
                ...caseConnectors[mockConnector.id],
                push: {
                  ...caseConnectors[mockConnector.id].push,
                  needsToBePushed: true,
                },
              },
            },
          }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );

      expect(result.current.needsToBePushed).toBe(true);
    });

    it('needsToBePushed=false if the connector does not exist', async () => {
      const { result } = renderHook(
        () =>
          usePushToService({
            ...defaultArgs,
            connector: {
              id: 'not-exist',
              name: 'not-exist',
              type: ConnectorTypes.none,
              fields: null,
            },
            isValidConnector: false,
          }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );

      expect(result.current.needsToBePushed).toBe(false);
    });

    it('hasBeenPushed=false if the connector has been pushed', async () => {
      const { result } = renderHook(
        () =>
          usePushToService({
            ...defaultArgs,
            caseConnectors: {
              ...caseConnectors,
              [mockConnector.id]: {
                ...caseConnectors[mockConnector.id],
                push: {
                  ...caseConnectors[mockConnector.id].push,
                  hasBeenPushed: false,
                },
              },
            },
          }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );

      expect(result.current.hasBeenPushed).toBe(false);
    });

    it('hasBeenPushed=false if the connector does not exist', async () => {
      const { result } = renderHook(
        () =>
          usePushToService({
            ...defaultArgs,
            connector: {
              id: 'not-exist',
              name: 'not-exist',
              type: ConnectorTypes.none,
              fields: null,
            },
            isValidConnector: false,
          }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );

      expect(result.current.hasBeenPushed).toBe(false);
    });

    it('hasPushPermissions=false if it does not have push permission', async () => {
      useFetchActionLicenseMock.mockReturnValue({
        isLoading: true,
        data: actionLicense,
      });

      const { result } = renderHook(() => usePushToService(defaultArgs), {
        wrapper: ({ children }) => (
          <TestProviders permissions={noPushCasesPermissions()}> {children}</TestProviders>
        ),
      });

      expect(result.current.hasPushPermissions).toBe(false);
    });

    it('hasLicenseError=true if enabledInLicense=false', async () => {
      useFetchActionLicenseMock.mockImplementation(() => ({
        isLoading: false,
        data: {
          ...actionLicense,
          enabledInLicense: false,
        },
      }));

      const { result } = renderHook(() => usePushToService(defaultArgs), {
        wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
      });

      expect(result.current.hasLicenseError).toBe(true);
    });

    it('hasLicenseError=false if data=undefined', async () => {
      useFetchActionLicenseMock.mockImplementation(() => ({
        isLoading: false,
        data: undefined,
      }));

      const { result } = renderHook(() => usePushToService(defaultArgs), {
        wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
      });

      expect(result.current.hasLicenseError).toBe(false);
    });
  });
});
