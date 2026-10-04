/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, renderHook } from '@testing-library/react';
import * as CheckPrivilige from '../../../../../capabilities/check_capabilities';
import mockAnalyticsListItem from '../analytics_list/__mocks__/analytics_list_item.json';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock as mockCoreServices, i18nServiceMock } from '@kbn/core/public/mocks';

import type { DataFrameAnalyticsListRow } from '../analytics_list/common';

import { DeleteActionModal } from './delete_action_modal';
import { deleteActionNameText, useDeleteAction } from './use_delete_action';

jest.mock('../../../../../capabilities/check_capabilities', () => ({
  checkPermission: jest.fn(() => false),
  createPermissionFailureMessage: jest.fn(() => 'no permission'),
}));

jest.mock('../../../../../contexts/kibana', () => ({
  useMlApi: jest.fn(),
  useMlKibana: () => ({
    services: { ...mockCoreServices.createStart(), data: { data_view: { find: jest.fn() } } },
  }),
  useNotifications: () => {
    return {
      toasts: { addSuccess: jest.fn(), addDanger: jest.fn(), addError: jest.fn() },
    };
  },
}));

export const MockI18nService = i18nServiceMock.create();
export const I18nServiceConstructor = jest.fn().mockImplementation(() => MockI18nService);
jest.doMock('@kbn/i18n', () => ({
  I18nService: I18nServiceConstructor,
}));

describe('DeleteAction', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const runningItem = {
    ...mockAnalyticsListItem,
    stats: { ...mockAnalyticsListItem.stats, state: 'started' },
  } as unknown as DataFrameAnalyticsListRow;
  const stoppedItem = mockAnalyticsListItem as unknown as DataFrameAnalyticsListRow;

  const renderAction = (canDeleteDataFrameAnalytics: boolean) => {
    const { result } = renderHook(() => useDeleteAction(canDeleteDataFrameAnalytics));
    const { action } = result.current;

    if (!('description' in action) || !('enabled' in action)) {
      throw new Error('Expected a default item action with a description and an enabled callback.');
    }

    const { description, enabled } = action;

    return {
      name: 'name' in action ? action.name : undefined,
      isEnabled: (item: DataFrameAnalyticsListRow) => enabled?.(item),
      describe: (item: DataFrameAnalyticsListRow) =>
        typeof description === 'function' ? description(item) : description,
    };
  };

  // EuiBasicTable renders `description` as an `EuiContextMenuItem` tooltip and only
  // suppresses the duplicate screen reader announcement when it is a string equal to
  // `name`, so an enabled action must not describe itself with a different value.
  it('should describe an enabled action with the same string as its name.', () => {
    const { name, isEnabled, describe } = renderAction(true);

    expect(name).toBe(deleteActionNameText);
    expect(isEnabled(stoppedItem)).toBe(true);
    expect(describe(stoppedItem)).toBe(deleteActionNameText);
  });

  it('should describe a disabled action with the reason it is disabled.', () => {
    const { isEnabled, describe } = renderAction(true);

    expect(isEnabled(runningItem)).toBe(false);
    expect(describe(runningItem)).toBe('Stop the data frame analytics job in order to delete it.');
  });

  it('should describe a missing delete permission.', () => {
    const { isEnabled, describe } = renderAction(false);

    expect(isEnabled(stoppedItem)).toBe(false);
    expect(describe(stoppedItem)).toBe('no permission');
  });

  describe('When delete model is open', () => {
    it('should not allow to delete target index by default.', () => {
      const mock = jest.spyOn(CheckPrivilige, 'checkPermission');
      mock.mockImplementation((p) => p === 'canDeleteDataFrameAnalytics');

      const TestComponent = () => {
        const deleteAction = useDeleteAction(true);

        return (
          <>
            {deleteAction.isModalVisible && <DeleteActionModal {...deleteAction} />}
            <button
              data-test-subj="mlAnalyticsJobDeleteButton"
              onClick={() => {
                // @ts-expect-error mock data is incorrectly typed
                deleteAction.openModal(mockAnalyticsListItem);
              }}
            >
              {deleteActionNameText}
            </button>
          </>
        );
      };

      const { getByTestId, queryByTestId } = render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );
      const deleteButton = getByTestId('mlAnalyticsJobDeleteButton');
      fireEvent.click(deleteButton);
      expect(getByTestId('mlAnalyticsJobDeleteModal')).toBeInTheDocument();
      expect(queryByTestId('mlAnalyticsJobDeleteIndexSwitch')).toBeNull();
      expect(queryByTestId('mlAnalyticsJobDeleteDataViewSwitch')).toBeNull();

      mock.mockRestore();
    });
  });
});
