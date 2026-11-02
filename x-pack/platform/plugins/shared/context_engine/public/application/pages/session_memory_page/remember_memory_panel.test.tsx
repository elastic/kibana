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
import { buildSessionContext, pdfFile, pngFile, renderWithProviders } from './test_helpers';

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

  it('disables submit until content or a file is set', () => {
    renderWithProviders(<RememberMemoryPanel />);
    const submit = screen.getByTestId('contextSessionMemoryRemember-submit');

    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId('contextSessionMemoryRemember-content'), {
      target: { value: 'Prefers dark mode' },
    });
    expect(submit).toBeEnabled();
  });

  it('disables submit while the user is unknown', () => {
    renderWithProviders(<RememberMemoryPanel />, {
      session: buildSessionContext({ userId: undefined }),
    });

    fireEvent.change(screen.getByTestId('contextSessionMemoryRemember-content'), {
      target: { value: 'Prefers dark mode' },
    });
    expect(screen.getByTestId('contextSessionMemoryRemember-submit')).toBeDisabled();
  });

  it('submits a text memory scoped to the session context', () => {
    const mutate = jest.fn();
    mockUseRememberSessionMemory.mockReturnValue(mutationResult({ mutate }));
    renderWithProviders(<RememberMemoryPanel />, {
      session: buildSessionContext({ aiIndexIds: ['support', 'sales'] }),
    });

    fireEvent.change(screen.getByTestId('contextSessionMemoryRemember-content'), {
      target: { value: '  Prefers dark mode ' },
    });
    fireEvent.click(screen.getByTestId('contextSessionMemoryRemember-submit'));

    expect(mutate).toHaveBeenCalledWith({
      session_id: 'session-1',
      user_id: 'kathleen',
      agent_id: 'elastic-agent',
      space: 'default',
      ai_index_id: ['support', 'sales'],
      content: 'Prefers dark mode',
    });
  });

  it('submits an uploaded image as a base64 media item and previews it', async () => {
    const mutate = jest.fn();
    mockUseRememberSessionMemory.mockReturnValue(mutationResult({ mutate }));
    renderWithProviders(<RememberMemoryPanel />);

    fireEvent.change(screen.getByTestId('contextSessionMemoryRemember-file'), {
      target: { files: [pngFile()] },
    });

    await screen.findByTestId('contextSessionMemoryRemember-file-preview');
    fireEvent.click(screen.getByTestId('contextSessionMemoryRemember-submit'));

    expect(mutate).toHaveBeenCalledWith({
      session_id: 'session-1',
      user_id: 'kathleen',
      agent_id: 'elastic-agent',
      space: 'default',
      media: [{ type: 'image', value: 'data:image/png;base64,iVBORw==', format: 'base64' }],
    });
  });

  it('submits an uploaded PDF as a pdf media item', async () => {
    const mutate = jest.fn();
    mockUseRememberSessionMemory.mockReturnValue(mutationResult({ mutate }));
    renderWithProviders(<RememberMemoryPanel />);

    fireEvent.change(screen.getByTestId('contextSessionMemoryRemember-file'), {
      target: { files: [pdfFile()] },
    });

    await screen.findByTestId('contextSessionMemoryRemember-file-pdf');
    fireEvent.click(screen.getByTestId('contextSessionMemoryRemember-submit'));

    expect(mutate).toHaveBeenCalledWith({
      session_id: 'session-1',
      user_id: 'kathleen',
      agent_id: 'elastic-agent',
      space: 'default',
      media: [{ type: 'pdf', value: 'data:application/pdf;base64,JVBERg==', format: 'base64' }],
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
    expect(screen.getByTestId('contextSessionMemoryRemember-stored')).toBeInTheDocument();
  });
});
