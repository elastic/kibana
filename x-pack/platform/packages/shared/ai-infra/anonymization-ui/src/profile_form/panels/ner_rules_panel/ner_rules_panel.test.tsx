/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NER_MODEL_ID } from '@kbn/anonymization-common';
import { NerRulesPanel } from './ner_rules_panel';
import { useProfileFormContext } from '../../profile_form_context';
import { buildProfileFormContextValue } from '../../test_fixtures/profile_form_context_value';

jest.mock('../../profile_form_context', () => ({
  useProfileFormContext: jest.fn(),
}));

const setContext = (overrides: Parameters<typeof buildProfileFormContextValue>[0] = {}) => {
  const onNerRulesChange = jest.fn();
  jest.mocked(useProfileFormContext).mockReturnValue({
    ...buildProfileFormContextValue({
      nerRules: [
        {
          id: 'ner-1',
          type: 'ner',
          modelId: 'ner-model-v1',
          allowedEntityClasses: ['PER', 'ORG'],
          enabled: true,
        },
      ],
    }),
    onNerRulesChange,
    ...overrides,
  });

  return { onNerRulesChange };
};

describe('NerRulesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows fields for creating new rules', () => {
    setContext();
    render(<NerRulesPanel />);

    expect(screen.getByTestId('anonymizationProfilesNerRulesDefaultModelId')).toHaveTextContent(
      NER_MODEL_ID
    );
    expect(screen.getByLabelText('New allowed entities')).toBeInTheDocument();
  });

  it('uses NER_MODEL_ID as default in manual mode when trusted models are not provided', () => {
    setContext({
      nerRules: [
        {
          id: 'ner-1',
          type: 'ner',
          modelId: undefined,
          allowedEntityClasses: ['PER', 'ORG'],
          enabled: true,
        },
      ],
    });
    render(<NerRulesPanel />);

    expect(screen.getByTestId('anonymizationProfilesNerRulesDefaultModelId')).toHaveTextContent(
      NER_MODEL_ID
    );
    expect(screen.queryByLabelText('New NER model id')).not.toBeInTheDocument();
    expect(screen.getByLabelText('NER model id for rule ner-1')).toHaveValue(NER_MODEL_ID);
  });

  it('uses trusted model provider options when multiple models are available', async () => {
    setContext({
      listTrustedNerModels: jest.fn().mockResolvedValue([
        { id: 'trusted-ner-v1', label: 'trusted-ner-v1' },
        { id: 'trusted-ner-v2', label: 'trusted-ner-v2' },
      ]),
    });
    render(<NerRulesPanel />);

    const modelSelect = await screen.findByLabelText('Model id');
    expect(modelSelect).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: 'trusted-ner-v1' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('option', { name: 'trusted-ner-v2' }).length).toBeGreaterThan(0);
  });

  it('shows read-only model name and auto-applies it when exactly one trusted model is available', async () => {
    const { onNerRulesChange } = setContext({
      nerRules: [
        {
          id: 'ner-1',
          type: 'ner',
          modelId: 'legacy-model',
          allowedEntityClasses: ['PER', 'ORG'],
          enabled: true,
        },
      ],
      listTrustedNerModels: jest
        .fn()
        .mockResolvedValue([{ id: 'trusted-ner-v1', label: 'trusted-ner-v1' }]),
    });
    render(<NerRulesPanel />);

    await waitFor(() => {
      expect(onNerRulesChange).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'ner-1',
          modelId: 'trusted-ner-v1',
        }),
      ]);
    });

    expect(screen.getAllByText('trusted-ner-v1').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('New NER model id')).not.toBeInTheDocument();
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
    if (removeButton) {
      fireEvent.click(removeButton);
    }
    expect(onNerRulesChange).toHaveBeenCalledWith([]);
  });

  it('shows info callout when there are no ner rules', () => {
    setContext({ nerRules: [] });
    render(<NerRulesPanel />);

    expect(screen.getByText('No NER rules configured')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Use NER rules to detect named entities and allow only selected entity classes.'
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

  it('shows allowed entity multiselect placeholders', () => {
    setContext();
    render(<NerRulesPanel />);

    expect(screen.getByLabelText('New allowed entities')).toBeInTheDocument();
    expect(screen.getByLabelText('Allowed entities for NER rule ner-1')).toBeInTheDocument();
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
        'NER model id is required and allowed entities must be selected from PER, ORG, LOC, MISC.',
    });
    render(<NerRulesPanel />);

    expect(
      screen.getByText(
        'NER model id is required and allowed entities must be selected from PER, ORG, LOC, MISC.'
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Allowed entities for NER rule ner-1')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });
});
