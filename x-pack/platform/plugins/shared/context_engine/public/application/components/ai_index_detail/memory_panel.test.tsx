/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useSaveAiIndexMemory } from '../../hooks/use_save_ai_index_memory';
import { MemoryPanel } from './memory_panel';

jest.mock('../../hooks/use_save_ai_index_memory', () => ({
  useSaveAiIndexMemory: jest.fn(),
}));

const mockUseSaveAiIndexMemory = jest.mocked(useSaveAiIndexMemory);
const saveMemoryEnabled = jest.fn();

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  memory_enabled: true,
  dest: { type: 'index', value: 'ai-index-idx-my-ai-index' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const renderPanel = (
  overrides: Partial<React.ComponentProps<typeof MemoryPanel>> = {},
  indexOverrides: Partial<GetAiIndexResponse> = {}
) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <MemoryPanel
          isLoading={false}
          aiIndex={{ ...aiIndex, ...indexOverrides }}
          onSaved={jest.fn()}
          {...overrides}
        />
      </EuiProvider>
    </I18nProvider>
  );

describe('MemoryPanel', () => {
  beforeEach(() => {
    saveMemoryEnabled.mockResolvedValue(true);
    mockUseSaveAiIndexMemory.mockReturnValue({
      saveMemoryEnabled,
      isSaving: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reflects the AI index memory setting', () => {
    renderPanel();

    expect(screen.getByTestId('contextAiIndexMemoryToggle')).toBeChecked();
  });

  it('disables memory and refreshes the AI index', async () => {
    const onSaved = jest.fn();
    renderPanel({ onSaved });

    fireEvent.click(screen.getByTestId('contextAiIndexMemoryToggle'));

    await waitFor(() => {
      expect(saveMemoryEnabled).toHaveBeenCalledWith(aiIndex, false);
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it('enables memory when the AI index setting is off', async () => {
    const disabledAiIndex = { ...aiIndex, memory_enabled: false };
    renderPanel({ aiIndex: disabledAiIndex });

    fireEvent.click(screen.getByTestId('contextAiIndexMemoryToggle'));

    await waitFor(() => {
      expect(saveMemoryEnabled).toHaveBeenCalledWith(disabledAiIndex, true);
    });
  });

  it('does not refresh when the update fails', async () => {
    const onSaved = jest.fn();
    saveMemoryEnabled.mockResolvedValue(false);
    renderPanel({ onSaved });

    fireEvent.click(screen.getByTestId('contextAiIndexMemoryToggle'));

    await waitFor(() => {
      expect(saveMemoryEnabled).toHaveBeenCalled();
    });
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('is read-only for managed AI indices', () => {
    renderPanel({}, { managed: true });

    expect(screen.getByTestId('contextAiIndexMemoryToggle')).toBeDisabled();
  });

  it('shows a loading state', () => {
    renderPanel({ isLoading: true, aiIndex: undefined });

    expect(screen.getByTestId('contextAiIndexMemoryLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexMemoryToggle')).not.toBeInTheDocument();
  });
});
