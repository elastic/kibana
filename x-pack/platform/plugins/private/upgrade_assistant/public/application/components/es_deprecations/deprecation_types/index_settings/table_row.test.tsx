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
import { mockIndexSettingDeprecation } from '../../__fixtures__/es_deprecations';
import { IndexSettingsTableRow } from './table_row';

type UpdateIndexSettings = (
  index: string,
  settings: string[]
) => Promise<{ error: ResponseError | null }>;

const mockUpdateIndexSettings = jest.fn<
  ReturnType<UpdateIndexSettings>,
  Parameters<UpdateIndexSettings>
>();

const mockAddContent = jest.fn<
  void,
  [
    {
      id: string;
      Component: React.ComponentType<unknown>;
      props: {
        removeIndexSettings: (index: string, settings: string[]) => Promise<void>;
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
          updateIndexSettings: (...args: Parameters<UpdateIndexSettings>) =>
            mockUpdateIndexSettings(...args),
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

describe('IndexSettingsTableRow', () => {
  const rowFieldNames: DeprecationTableColumns[] = ['correctiveAction', 'actions'];

  beforeEach(() => {
    mockUpdateIndexSettings.mockReset();
    mockAddContent.mockClear();
    mockRemoveContent.mockClear();
  });

  const renderRow = () =>
    renderWithI18n(
      <table>
        <tbody>
          <IndexSettingsTableRow
            deprecation={mockIndexSettingDeprecation}
            rowFieldNames={rowFieldNames}
            index={0}
          />
        </tbody>
      </table>
    );

  it('opens flyout when action link is clicked', async () => {
    renderRow();

    fireEvent.click(screen.getByTestId('deprecation-indexSetting'));

    await waitFor(() => {
      expect(mockAddContent).toHaveBeenCalled();
    });

    expect(mockAddContent.mock.calls[0][0].id).toBe('indexSettingsFlyout');
  });

  it('updates resolution cell on successful settings removal', async () => {
    mockUpdateIndexSettings.mockResolvedValue({ error: null });
    renderRow();

    fireEvent.click(screen.getByTestId('deprecation-indexSetting'));

    await waitFor(() => {
      expect(mockAddContent).toHaveBeenCalled();
    });

    const { removeIndexSettings } = mockAddContent.mock.calls[0][0].props;
    await act(async () => {
      await removeIndexSettings('my_index', ['index.routing.allocation.include._tier']);
    });

    expect(mockUpdateIndexSettings).toHaveBeenCalledWith('my_index', [
      'index.routing.allocation.include._tier',
    ]);
    expect(mockRemoveContent).toHaveBeenCalledWith('indexSettingsFlyout');

    const resolutionCell = within(
      screen.getByTestId('indexSettingsTableCell-correctiveAction')
    ).getByTestId('indexSettingsResolutionStatusCell');
    await waitFor(() => {
      expect(resolutionCell).toHaveTextContent('Deprecated settings removed');
    });
  });

  it('updates resolution cell on failed settings removal', async () => {
    const error: ResponseError = { statusCode: 500, message: 'Remove index settings error' };
    mockUpdateIndexSettings.mockResolvedValue({ error });
    renderRow();

    fireEvent.click(screen.getByTestId('deprecation-indexSetting'));
    await waitFor(() => {
      expect(mockAddContent).toHaveBeenCalled();
    });

    const { removeIndexSettings } = mockAddContent.mock.calls[0][0].props;
    await act(async () => {
      await removeIndexSettings('my_index', ['index.routing.allocation.include._tier']);
    });

    expect(mockRemoveContent).not.toHaveBeenCalled();

    const resolutionCell = within(
      screen.getByTestId('indexSettingsTableCell-correctiveAction')
    ).getByTestId('indexSettingsResolutionStatusCell');
    await waitFor(() => {
      expect(resolutionCell).toHaveTextContent('Settings removal failed');
    });
  });
});
