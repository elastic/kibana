/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { useRememberSessionMemory } from '../../hooks/use_session_memory_mutations';
import { RememberMemoryPanel } from './remember_memory_panel';
import { fillScope, pngFile, renderWithProviders } from './test_helpers';

jest.mock('../../hooks/use_session_memory_mutations', () => ({
  useRememberSessionMemory: jest.fn(),
}));

const mockUseRememberSessionMemory = jest.mocked(useRememberSessionMemory);

const mutationResult = (overrides = {}) =>
  ({ mutate: jest.fn(), isLoading: false, data: undefined, ...overrides } as unknown as ReturnType<
    typeof useRememberSessionMemory
  >);

describe('RememberMemoryPanel', () => {
  beforeEach(() => {
    mockUseRememberSessionMemory.mockReturnValue(mutationResult());
  });

  afterEach(() => jest.clearAllMocks());

  it('disables submit until the ids and content or a file are set', async () => {
    renderWithProviders(<RememberMemoryPanel />);
    const submit = screen.getByTestId('contextSessionMemoryRemember-submit');

    expect(submit).toBeDisabled();
    fillScope('contextSessionMemoryRemember');
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId('contextSessionMemoryRemember-content'), {
      target: { value: 'Prefers dark mode' },
    });
    expect(submit).toBeEnabled();
  });

  it('submits a text memory with only the set fields', () => {
    const mutate = jest.fn();
    mockUseRememberSessionMemory.mockReturnValue(mutationResult({ mutate }));
    renderWithProviders(<RememberMemoryPanel />);

    fillScope('contextSessionMemoryRemember');
    fireEvent.change(screen.getByTestId('contextSessionMemoryRemember-space'), {
      target: { value: 'default' },
    });
    fireEvent.change(screen.getByTestId('contextSessionMemoryRemember-type'), {
      target: { value: 'preference' },
    });
    fireEvent.change(screen.getByTestId('contextSessionMemoryRemember-content'), {
      target: { value: '  Prefers dark mode ' },
    });
    fireEvent.click(screen.getByTestId('contextSessionMemoryRemember-submit'));

    expect(mutate).toHaveBeenCalledWith({
      session_id: 's-1',
      user_id: 'u-1',
      agent_id: 'a-1',
      space: 'default',
      type: 'preference',
      content: 'Prefers dark mode',
    });
  });

  it('submits an uploaded image as a base64 media item and previews it', async () => {
    const mutate = jest.fn();
    mockUseRememberSessionMemory.mockReturnValue(mutationResult({ mutate }));
    renderWithProviders(<RememberMemoryPanel />);

    fillScope('contextSessionMemoryRemember');
    fireEvent.change(screen.getByTestId('contextSessionMemoryRemember-file'), {
      target: { files: [pngFile()] },
    });

    await screen.findByTestId('contextSessionMemoryRemember-file-preview');
    expect(screen.getByTestId('contextSessionMemoryRemember-submit')).toBeEnabled();

    fireEvent.click(screen.getByTestId('contextSessionMemoryRemember-submit'));

    expect(mutate).toHaveBeenCalledWith({
      session_id: 's-1',
      user_id: 'u-1',
      agent_id: 'a-1',
      media: [{ type: 'image', value: 'data:image/png;base64,iVBORw==', format: 'base64' }],
    });
  });

  it('shows the file picker error for an unsupported file', async () => {
    renderWithProviders(<RememberMemoryPanel />);

    fireEvent.change(screen.getByTestId('contextSessionMemoryRemember-file'), {
      target: { files: [new File(['<svg/>'], 'pic.svg', { type: 'image/svg+xml' })] },
    });

    await waitFor(() =>
      expect(screen.getByText(/Only PNG, JPEG, WebP, GIF, and PDF/)).toBeInTheDocument()
    );
    expect(screen.getByTestId('contextSessionMemoryRemember-submit')).toBeDisabled();
  });

  it('shows the stored id after a successful remember', () => {
    mockUseRememberSessionMemory.mockReturnValue(
      mutationResult({ data: { id: 'm-1', '@timestamp': '2026-01-01T00:00:00.000Z' } })
    );
    renderWithProviders(<RememberMemoryPanel />);

    expect(screen.getByTestId('contextSessionMemoryRemember-success')).toHaveTextContent(
      'Remembered memory m-1 at 2026-01-01T00:00:00.000Z'
    );
  });
});
