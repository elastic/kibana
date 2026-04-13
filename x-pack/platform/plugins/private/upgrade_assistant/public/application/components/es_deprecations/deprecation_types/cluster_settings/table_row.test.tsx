/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { ResponseError } from '../../../../../../common/types';
import type { DeprecationTableColumns } from '../../../types';
import { mockClusterSettingDeprecation } from '../../__fixtures__/es_deprecations';
import { ClusterSettingsTableRow } from './table_row';

type UpdateClusterSettings = (settings: string[]) => Promise<{ error: ResponseError | null }>;

const mockUpdateClusterSettings = jest.fn<
  ReturnType<UpdateClusterSettings>,
  Parameters<UpdateClusterSettings>
>();

const mockAddContent = jest.fn<
  void,
  [
    {
      id: string;
      Component: React.ComponentType<unknown>;
      props: {
        removeClusterSettings: (settings: string[]) => Promise<void>;
      };
    }
  ]
>();
const mockRemoveContent = jest.fn<void, [id: string]>();

jest.mock('../../../../app_context', () => {
  const actual = jest.requireActual('../../../../app_context');

  return {
    ...actual,
    useAppContext: () => ({
      services: {
        api: {
          updateClusterSettings: (...args: Parameters<UpdateClusterSettings>) =>
            mockUpdateClusterSettings(...args),
        },
      },
    }),
  };
});

jest.mock('../../../../../shared_imports', () => {
  const actual = jest.requireActual('../../../../../shared_imports');

  return {
    ...actual,
    GlobalFlyout: {
      ...actual.GlobalFlyout,
      useGlobalFlyout: () => ({
        addContent: (...args: Parameters<typeof mockAddContent>) => mockAddContent(...args),
        removeContent: (...args: Parameters<typeof mockRemoveContent>) =>
          mockRemoveContent(...args),
      }),
    },
  };
});

describe('ClusterSettingsTableRow', () => {
  const rowFieldNames: DeprecationTableColumns[] = ['correctiveAction', 'actions'];

  beforeEach(() => {
    mockUpdateClusterSettings.mockReset();
    mockAddContent.mockClear();
    mockRemoveContent.mockClear();
  });

  const renderRow = () =>
    renderWithI18n(
      <table>
        <tbody>
          <ClusterSettingsTableRow
            deprecation={mockClusterSettingDeprecation}
            rowFieldNames={rowFieldNames}
            index={0}
          />
        </tbody>
      </table>
    );

  it('opens flyout when action link is clicked', async () => {
    renderRow();

    fireEvent.click(screen.getByTestId('deprecation-clusterSetting'));

    await waitFor(() => {
      expect(mockAddContent).toHaveBeenCalled();
    });

    expect(mockAddContent.mock.calls[0][0].id).toBe('clusterSettingsFlyout');
  });

  it('updates resolution cell on successful settings removal', async () => {
    mockUpdateClusterSettings.mockResolvedValue({ error: null });
    renderRow();

    fireEvent.click(screen.getByTestId('deprecation-clusterSetting'));
    await waitFor(() => {
      expect(mockAddContent).toHaveBeenCalled();
    });

    const { removeClusterSettings } = mockAddContent.mock.calls[0][0].props;
    await act(async () => {
      await removeClusterSettings(['cluster.routing.allocation.require._tier']);
    });

    expect(mockUpdateClusterSettings).toHaveBeenCalledWith([
      'cluster.routing.allocation.require._tier',
    ]);
    expect(mockRemoveContent).toHaveBeenCalledWith('clusterSettingsFlyout');

    const resolutionCell = within(
      screen.getByTestId('clusterSettingsTableCell-correctiveAction')
    ).getByTestId('clusterSettingsResolutionStatusCell');

    await waitFor(() => {
      expect(resolutionCell).toHaveTextContent('Deprecated settings removed');
    });
  });

  it('updates resolution cell on failed settings removal', async () => {
    const error: ResponseError = { statusCode: 500, message: 'Remove cluster settings error' };
    mockUpdateClusterSettings.mockResolvedValue({ error });
    renderRow();

    fireEvent.click(screen.getByTestId('deprecation-clusterSetting'));
    await waitFor(() => {
      expect(mockAddContent).toHaveBeenCalled();
    });

    const { removeClusterSettings } = mockAddContent.mock.calls[0][0].props;
    await act(async () => {
      await removeClusterSettings(['cluster.routing.allocation.require._tier']);
    });

    const resolutionCell = within(
      screen.getByTestId('clusterSettingsTableCell-correctiveAction')
    ).getByTestId('clusterSettingsResolutionStatusCell');

    await waitFor(() => {
      expect(resolutionCell).toHaveTextContent('Settings removal failed');
    });
  });
});
