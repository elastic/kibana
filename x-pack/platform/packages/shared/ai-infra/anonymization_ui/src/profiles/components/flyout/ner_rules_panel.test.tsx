/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NerRulesPanel } from './ner_rules_panel';
import { useProfileFlyoutContext } from './context';

jest.mock('./context', () => ({
  useProfileFlyoutContext: jest.fn(),
}));

const setContext = (overrides: Partial<ReturnType<typeof useProfileFlyoutContext>> = {}) => {
  const onNerRulesChange = jest.fn();
  jest.mocked(useProfileFlyoutContext).mockReturnValue({
    nerRules: [
      {
        id: 'ner-1',
        type: 'ner',
        modelId: 'ner-model-v1',
        allowedEntityClasses: ['PER', 'ORG'],
        enabled: true,
      },
    ],
    onNerRulesChange,
    isManageMode: true,
    isSubmitting: false,
    ...overrides,
  } as unknown as ReturnType<typeof useProfileFlyoutContext>);

  return { onNerRulesChange };
};

describe('NerRulesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows labeled inputs for creating new rules', () => {
    setContext();
    render(<NerRulesPanel />);

    expect(screen.getByLabelText('NER model id')).toBeInTheDocument();
    expect(screen.getByLabelText('Allowed entities')).toBeInTheDocument();
  });

  it('uses trusted model provider options when available', async () => {
    setContext({
      listTrustedNerModels: jest
        .fn()
        .mockResolvedValue([{ id: 'trusted-ner-v1', label: 'trusted-ner-v1' }]),
    });
    render(<NerRulesPanel />);

    const modelSelect = await screen.findByLabelText('NER model id');
    expect(modelSelect).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: 'trusted-ner-v1' }).length).toBeGreaterThan(0);
  });

  it('toggles rule state through enabled/disabled button group', () => {
    const { onNerRulesChange } = setContext();
    render(<NerRulesPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(onNerRulesChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'ner-1', enabled: false }),
    ]);
  });

  it('removes a ner rule with trash action', () => {
    const { onNerRulesChange } = setContext();
    const { container } = render(<NerRulesPanel />);

    const removeButton = container.querySelector(
      '[data-test-subj="anonymizationProfilesNerRuleRemove"]'
    );
    expect(removeButton).toBeTruthy();
    fireEvent.click(removeButton as Element);
    expect(onNerRulesChange).toHaveBeenCalledWith([]);
  });

  it('shows info callout when there are no ner rules', () => {
    setContext({ nerRules: [] });
    render(<NerRulesPanel />);

    expect(screen.getByText('No NER rules configured')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Use NER rules to detect named entities with a trusted model and allow only selected entity classes.'
      )
    ).toBeInTheDocument();
  });

  it('shows trusted model unavailable warning when provider returns no models', async () => {
    setContext({
      listTrustedNerModels: jest.fn().mockResolvedValue([]),
    });
    render(<NerRulesPanel />);

    expect(
      await screen.findByText('No trusted NER model available. NER rules are unavailable.')
    ).toBeInTheDocument();
  });

  it('requires allowed entities to enable add button', () => {
    setContext();
    render(<NerRulesPanel />);

    fireEvent.change(screen.getByLabelText('New allowed entities'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Add NER' })).toBeDisabled();
  });

  it('shows row-level invalid state when ner validation error is present', () => {
    setContext({
      nerRules: [
        {
          id: 'ner-1',
          type: 'ner',
          modelId: 'ner-model-v1',
          allowedEntityClasses: [],
          enabled: true,
        },
      ],
      nerRulesError:
        'NER model id is required and allowed entities must be a comma-separated list (for example: PER,ORG,LOC).',
    });
    render(<NerRulesPanel />);

    expect(
      screen.getByText(
        'NER model id is required and allowed entities must be a comma-separated list (for example: PER,ORG,LOC).'
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Allowed entities for NER rule ner-1')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  it('preserves commas and spaces while editing allowed entities', () => {
    const { onNerRulesChange } = setContext();
    render(<NerRulesPanel />);

    fireEvent.change(screen.getByLabelText('Allowed entities for NER rule ner-1'), {
      target: { value: 'PER, ORG,' },
    });

    expect(onNerRulesChange).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'ner-1',
        allowedEntityClasses: ['PER', ' ORG', ''],
      }),
    ]);
  });
});
