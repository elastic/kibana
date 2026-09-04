/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { renderWithI18n } from '@kbn/test-jest-helpers';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { TRANSFORM_FUNCTION } from '../../../../../../common/constants';

import {
  CreateTransformButton,
  getCreateTransformPrimaryActionItem,
} from './create_transform_button';

const queryClient = new QueryClient();

jest.mock('../../../../hooks', () => ({
  useTransformCapabilities: () => ({
    canCreateTransform: true,
    canPreviewTransform: true,
    canStartStopTransform: true,
  }),
}));

describe('Transform: Transform List <CreateTransformButton />', () => {
  test('Minimal initialization', () => {
    const { container } = renderWithI18n(
      <QueryClientProvider client={queryClient}>
        <CreateTransformButton onClick={jest.fn()} transformNodes={1} />
      </QueryClientProvider>
    );
    expect(container.textContent).toBe('Create transform');
  });

  test('opens transform function picker and calls onClick with selection', async () => {
    const onClick = jest.fn();
    renderWithI18n(
      <QueryClientProvider client={queryClient}>
        <CreateTransformButton onClick={onClick} transformNodes={1} />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByTestId('transformButtonCreate'));
    await waitFor(() => {
      expect(screen.getByTestId('transformCreateLatestButton')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('transformCreateLatestButton'));

    expect(onClick).toHaveBeenCalledWith(TRANSFORM_FUNCTION.LATEST);
  });

  test('builds an enabled AppHeader primary action with pivot and latest items', () => {
    const onClick = jest.fn();
    const primaryActionItem = getCreateTransformPrimaryActionItem({
      onClick,
      transformNodes: 1,
      capabilities: {
        canCreateTransform: true,
        canPreviewTransform: true,
        canStartStopTransform: true,
      },
    });

    expect(primaryActionItem.testId).toBe('transformButtonCreate');
    expect('items' in primaryActionItem).toBe(true);
    if (!('items' in primaryActionItem) || primaryActionItem.items === undefined) {
      throw new Error('expected popover items');
    }

    const pivotItem = primaryActionItem.items.find(({ id }) => id === 'createPivot');
    const latestItem = primaryActionItem.items.find(({ id }) => id === 'createLatest');
    if (pivotItem === undefined || latestItem === undefined) {
      throw new Error('expected pivot and latest items');
    }

    pivotItem.run?.({
      triggerElement: document.createElement('button'),
      returnFocus: () => {},
    });
    latestItem.run?.({
      triggerElement: document.createElement('button'),
      returnFocus: () => {},
    });
    expect(onClick).toHaveBeenNthCalledWith(1, TRANSFORM_FUNCTION.PIVOT);
    expect(onClick).toHaveBeenNthCalledWith(2, TRANSFORM_FUNCTION.LATEST);
  });

  test('disables the AppHeader primary action when there are no transform nodes', () => {
    const primaryActionItem = getCreateTransformPrimaryActionItem({
      onClick: jest.fn(),
      transformNodes: 0,
      capabilities: {
        canCreateTransform: true,
        canPreviewTransform: true,
        canStartStopTransform: true,
      },
    });

    expect(primaryActionItem.disableButton).toBe(true);
    expect(primaryActionItem.testId).toBe('transformButtonCreate');
    expect(primaryActionItem.tooltipContent).toBe(
      'There are no transform nodes available. Please contact your administrator.'
    );
  });

  test('reports missing preview permission when the AppHeader create action is disabled', () => {
    const primaryActionItem = getCreateTransformPrimaryActionItem({
      onClick: jest.fn(),
      transformNodes: 1,
      capabilities: {
        canCreateTransform: true,
        canPreviewTransform: false,
        canStartStopTransform: true,
      },
    });

    expect(primaryActionItem.disableButton).toBe(true);
    expect(primaryActionItem.tooltipContent).toBe(
      'You do not have permission to preview transforms. Please contact your administrator.'
    );
  });

  test('reports missing start/stop permission when the AppHeader create action is disabled', () => {
    const primaryActionItem = getCreateTransformPrimaryActionItem({
      onClick: jest.fn(),
      transformNodes: 1,
      capabilities: {
        canCreateTransform: true,
        canPreviewTransform: true,
        canStartStopTransform: false,
      },
    });

    expect(primaryActionItem.disableButton).toBe(true);
    expect(primaryActionItem.tooltipContent).toBe(
      'You do not have permission to start or stop transforms. Please contact your administrator.'
    );
  });
});
