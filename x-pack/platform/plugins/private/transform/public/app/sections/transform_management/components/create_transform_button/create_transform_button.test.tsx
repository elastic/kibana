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

import { CreateTransformButton } from './create_transform_button';

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
    expect(container.textContent).toBe('Create a transform');
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
});
