/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import type { SetupWizardProgress } from '../../../../utils/setup_wizard_view';
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

const progress: SetupWizardProgress = {
  aiIndex: testAiIndex,
  dreaming: undefined,
  memoryCount: 0,
  isMemoryEnabled: true,
};

describe('sourcesStep', () => {
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
    const onSaved = jest.fn();
    const onBusyChange = jest.fn();
    const { Content } = sourcesStep;

    renderWithServices(
      <Content
        aiIndex={testAiIndex}
        onSaved={onSaved}
        onBusyChange={onBusyChange}
        layout={createTestLayoutControls(sourcesStep)}
      />
    );

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
});
