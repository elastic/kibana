/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseRequestResponse } from '@kbn/es-ui-shared-plugin/public';

import { waitFor, fireEvent } from '@testing-library/react';

import type {
  GetUninstallTokensMetadataResponse,
  GetUninstallTokenResponse,
} from '../../../../../../common/types/rest_spec/uninstall_token';
import type { RequestError } from '../../../../../hooks';
import { createFleetTestRendererMock } from '../../../../../mock';
import {
  useGetUninstallToken,
  useGetUninstallTokens,
  sendGetUninstallToken,
} from '../../../../../hooks/use_request/uninstall_tokens';
import type {
  UninstallToken,
  UninstallTokenMetadata,
} from '../../../../../../common/types/models/uninstall_token';

import { UninstallTokenListPage } from '.';

jest.mock('../../../../../hooks/use_request/uninstall_tokens', () => ({
  useGetUninstallToken: jest.fn(),
  useGetUninstallTokens: jest.fn(),
  sendGetUninstallToken: jest.fn(),
}));

type MockResponseType<DataType> = Pick<
  UseRequestResponse<DataType, RequestError>,
  'data' | 'error' | 'isLoading'
>;

describe('UninstallTokenList page', () => {
  const render = () => {
    const renderer = createFleetTestRendererMock();

    return renderer.render(<UninstallTokenListPage />);
  };

  const useGetUninstallTokenMock = useGetUninstallToken as jest.Mock;
  const useGetUninstallTokensMock = useGetUninstallTokens as jest.Mock;
  const sendGetUninstallTokenMock = sendGetUninstallToken as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when loading tokens', () => {
    it('should show loading message', () => {
      const getTokensResponseFixture: MockResponseType<GetUninstallTokensMetadataResponse> = {
        isLoading: true,
        error: null,
      };
      useGetUninstallTokensMock.mockReturnValue(getTokensResponseFixture);

      const renderResult = render();

      expect(renderResult.queryByTestId('uninstallTokenListTable')).toBeInTheDocument();
      expect(renderResult.queryByText('Loading uninstall tokens...')).toBeInTheDocument();
    });
  });

  describe('when there are no uninstall tokens', () => {
    it('should show message when no tokens found', () => {
      const getTokensResponseFixture: MockResponseType<GetUninstallTokensMetadataResponse> = {
        isLoading: false,
        error: null,
        data: { items: [], total: 0, page: 1, perPage: 20 },
      };
      useGetUninstallTokensMock.mockReturnValue(getTokensResponseFixture);

      const renderResult = render();

      expect(renderResult.queryByTestId('uninstallTokenListTable')).toBeInTheDocument();
      expect(renderResult.queryByText('No uninstall tokens found.')).toBeInTheDocument();
    });
  });

  describe('when there are tokens', () => {
    const uninstallTokenMetadataFixture1: UninstallTokenMetadata = {
      id: 'id-1',
      policy_id: 'policy-id-1',
      policy_name: 'Dummy Policy Name',
      created_at: '2023-06-19T08:47:31.457Z',
    };

    const uninstallTokenMetadataFixture2: UninstallTokenMetadata = {
      id: 'id-2',
      policy_id: 'policy-id-2',
      policy_name: null,
      created_at: '2023-06-20T08:47:31.457Z',
    };

    const uninstallTokenFixture: UninstallToken = {
      ...uninstallTokenMetadataFixture1,
      token: '123456789',
    };

    const generateGetUninstallTokensFixture = (items: UninstallTokenMetadata[]) => ({
      isLoading: false,
      error: null,
      data: {
        items,
        total: items.length,
        page: 1,
        perPage: 20,
      },
    });

    const getTokenResponseFixture: MockResponseType<GetUninstallTokenResponse> = {
      error: null,
      isLoading: false,
      data: { item: uninstallTokenFixture },
    };

    beforeEach(() => {
      useGetUninstallTokensMock.mockReturnValue(
        generateGetUninstallTokensFixture([
          uninstallTokenMetadataFixture1,
          uninstallTokenMetadataFixture2,
        ])
      );
    });

    it('should render table with token', () => {
      const renderResult = render();

      expect(renderResult.queryByTestId('uninstallTokenListTable')).toBeInTheDocument();
      expect(renderResult.queryByText('policy-id-1')).toBeInTheDocument();
    });

    it('should NOT show hint if Policy Name is found', () => {
      useGetUninstallTokensMock.mockReturnValue(
        generateGetUninstallTokensFixture([uninstallTokenMetadataFixture1])
      );
      const renderResult = render();

      expect(renderResult.queryByTestId('emptyPolicyNameHint')).not.toBeInTheDocument();
      expect(renderResult.queryByText('Dummy Policy Name')).toBeInTheDocument();
    });

    it('should show hint if Policy Name is not found', () => {
      useGetUninstallTokensMock.mockReturnValue(
        generateGetUninstallTokensFixture([uninstallTokenMetadataFixture2])
      );
      const renderResult = render();

      expect(renderResult.queryByTestId('emptyPolicyNameHint')).toBeInTheDocument();
      expect(renderResult.queryByText('Dummy Policy Name')).not.toBeInTheDocument();
    });

    it('should hide token by default', () => {
      const renderResult = render();

      expect(renderResult.queryByText(uninstallTokenFixture.token)).not.toBeInTheDocument();
      expect(renderResult.queryAllByText('••••••••••••••••••••••••••••••••').length).toBe(2);
    });

    it('should fetch and show token when clicking on the "Show" button', async () => {
      sendGetUninstallTokenMock.mockReturnValue(getTokenResponseFixture);

      const renderResult = render();

      renderResult.getAllByTestId('showHideTokenButton')[0].click();

      await waitFor(() => {
        expect(renderResult.queryByText(uninstallTokenFixture.token)).toBeInTheDocument();
      });
      expect(sendGetUninstallTokenMock).toHaveBeenCalledWith(uninstallTokenMetadataFixture1.id);
    });

    it('should show flyout for uninstall command when clicking on the "View uninstall command" button', async () => {
      useGetUninstallTokenMock.mockReturnValue(getTokenResponseFixture);
      const renderResult = render();

      renderResult.getAllByTestId('uninstallTokensViewCommandButton')[0].click();

      await waitFor(() => {
        expect(renderResult.queryByTestId('uninstall-command-flyout')).toBeInTheDocument();
        expect(
          renderResult.queryByText(`--uninstall-token ${uninstallTokenFixture.token}`, {
            exact: false,
          })
        ).toBeInTheDocument();
      });
      expect(useGetUninstallTokenMock).toHaveBeenCalledWith(uninstallTokenFixture.id);
    });

    it('should filter by policyID or policy name', async () => {
      const renderResult = render();

      fireEvent.change(renderResult.getByTestId('uninstallTokensPolicyIdSearchInput'), {
        target: { value: 'searched policy id' },
      });

      expect(useGetUninstallTokensMock).toHaveBeenCalledWith({
        page: 1,
        perPage: 20,
        search: 'searched policy id',
      });
    });
  });
});
