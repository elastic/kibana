/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import type { SetupWizardProgress } from '../../../../utils/setup_wizard_view';
import type { SelectedSource } from '../../sources/types';
import { createTestLayoutControls, renderWithServices, testAiIndex } from '../test_utils';
import { sourcesStep } from './sources_step';

// The Sources tab's editor has its own tests; here it only needs to show up with the right props.
const mockSourcesPanel = jest.fn();
jest.mock('../../sources/sources_panel', () => ({
  SourcesPanel: (props: unknown) => {
    mockSourcesPanel(props);
    return <div data-test-subj="mockSourcesPanel" />;
  },
}));

jest.mock('../../../../hooks/use_save_ai_index_sources');

const { useSaveAiIndexSources } = jest.requireMock('../../../../hooks/use_save_ai_index_sources');

const mockSaveSources = jest.fn();

const savedSource: SelectedSource = { type: 'esql', value: 'FROM logs-*' };
const pendingSource: SelectedSource = { type: 'connector', value: 'my-connector' };

const renderStep = ({ aiIndex = testAiIndex, isDone = false } = {}) => {
  const onSaved = jest.fn();
  const onBusyChange = jest.fn();
  const layout = createTestLayoutControls(sourcesStep, { isDone });
  const { Content } = sourcesStep;
  renderWithServices(
    <Content aiIndex={aiIndex} onSaved={onSaved} onBusyChange={onBusyChange} layout={layout} />
  );
  return { onSaved, onBusyChange, layout };
};

/** Picks sources in the mocked add panel, the way a click on a checkbox does. */
const pickSources = (sources: SelectedSource[]) => {
  const [{ onPendingChange }] = mockSourcesPanel.mock.calls.at(-1);
  act(() => onPendingChange(sources));
};

const progress: SetupWizardProgress = {
  aiIndex: testAiIndex,
  dreaming: undefined,
  memoryCount: 0,
  isMemoryEnabled: true,
};

describe('sourcesStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveSources.mockResolvedValue(true);
    useSaveAiIndexSources.mockReturnValue({ saveSources: mockSaveSources, isSaving: false });
  });

  it('is optional and done once the AI index has a source', () => {
    expect(sourcesStep.isOptional).toBe(true);
    expect(sourcesStep.isDone(progress)).toBe(false);
    expect(
      sourcesStep.isDone({
        ...progress,
        aiIndex: { ...testAiIndex, sources: [{ type: 'esql', value: 'FROM logs-*' }] },
      })
    ).toBe(true);
  });

  it('shows the Sources tab editor without its description, and reports its saving', () => {
    const { onSaved, onBusyChange } = renderStep();

    expect(screen.getByTestId('mockSourcesPanel')).toBeInTheDocument();
    expect(mockSourcesPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        aiIndex: testAiIndex,
        onSaved,
        isManaged: false,
        showDescription: false,
        onSavingChange: onBusyChange,
      })
    );
  });

  it('offers Skip until a source is picked, then Continue adds the picked sources', async () => {
    const aiIndex = { ...testAiIndex, sources: [savedSource] };
    const { layout } = renderStep({ aiIndex });

    expect(screen.getByTestId('contextSetupWizardSkip')).toBeInTheDocument();

    pickSources([pendingSource]);
    fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

    const [save] = jest.mocked(layout.onContinue).mock.calls[0];
    expect(await save?.()).toBe(true);
    expect(mockSaveSources).toHaveBeenCalledWith(aiIndex, [savedSource, pendingSource]);
  });

  it('offers Skip again when the picked sources are cleared', () => {
    renderStep();

    pickSources([pendingSource]);
    pickSources([]);

    expect(screen.getByTestId('contextSetupWizardSkip')).toBeInTheDocument();
  });
});
