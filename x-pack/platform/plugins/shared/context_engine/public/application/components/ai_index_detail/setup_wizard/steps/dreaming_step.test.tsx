/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import type { LoadedDreamingTemplate } from '../../../../../../common/dreaming_templates';
import type { SetupWizardProgress } from '../../../../utils/setup_wizard_view';
import { createTestLayoutControls, renderWithServices, testAiIndex } from '../test_utils';
import { dreamingStep } from './dreaming_step';

jest.mock('../../../../hooks/use_apply_dreaming_template');
jest.mock('../../../../hooks/use_dreaming_templates');

const { useApplyDreamingTemplate } = jest.requireMock(
  '../../../../hooks/use_apply_dreaming_template'
);
const { useDreamingTemplates } = jest.requireMock('../../../../hooks/use_dreaming_templates');

const SUPPORT: LoadedDreamingTemplate = {
  id: 'customer_support',
  name: 'Customer support',
  description: 'Solutions from resolved tickets.',
  summary: 'Customer support knowledge base.',
  rationale: 'Support knowledge centers on issues.',
  dreaming: {
    instructions: 'Record confirmed fixes.',
    facts: [{ type: 'solution', description: 'A confirmed fix.' }],
    entities: { nodes: [{ type: 'issue', description: 'A known problem.' }] },
  },
};

const LEGAL: LoadedDreamingTemplate = {
  id: 'legal_assistant',
  name: 'Legal assistant',
  description: 'Obligations from contracts.',
  summary: 'Legal knowledge.',
  rationale: 'Rules and the documents that apply them.',
  dreaming: { facts: [{ type: 'obligation' }] },
};

const mockApplyTemplate = jest.fn();

const renderStep = ({ isDone = false, isBusy = false } = {}) => {
  const layout = createTestLayoutControls(dreamingStep, { isDone, isBusy });
  const { Content } = dreamingStep;
  renderWithServices(
    <Content aiIndex={testAiIndex} onSaved={jest.fn()} onBusyChange={jest.fn()} layout={layout} />
  );
  return layout;
};

const pickTemplate = (id: string) =>
  fireEvent.click(screen.getByTestId(`contextDreamingTemplateOption-${id}`));

const progress: SetupWizardProgress = {
  aiIndex: testAiIndex,
  dreaming: undefined,
  memoryCount: 0,
  isMemoryEnabled: true,
};

describe('dreamingStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApplyTemplate.mockResolvedValue(true);
    useApplyDreamingTemplate.mockReturnValue({
      applyTemplate: mockApplyTemplate,
      isSaving: false,
    });
    useDreamingTemplates.mockReturnValue({
      templates: [SUPPORT, LEGAL],
      isLoading: false,
      error: undefined,
    });
  });

  it('is shown only with memory', () => {
    expect(dreamingStep.isAvailable?.(progress)).toBe(true);
    expect(dreamingStep.isAvailable?.({ ...progress, isMemoryEnabled: false })).toBe(false);
  });

  it('is done once dreaming is set up', () => {
    expect(dreamingStep.isDone(progress)).toBe(false);
    expect(dreamingStep.isDone({ ...progress, dreaming: { enabled: true } })).toBe(true);
  });

  it('opens with no template picked and offers Skip', () => {
    renderStep();

    expect(screen.getByTestId('contextDreamingTemplateOption-customer_support')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.queryByTestId('contextDreamingConfigFacts')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextSetupWizardSkip')).toBeEnabled();
    expect(screen.queryByTestId('contextSetupWizardContinue')).not.toBeInTheDocument();
  });

  it('shows the template description and its fact types once a template is picked', () => {
    renderStep();

    pickTemplate('customer_support');

    expect(screen.getByTestId('contextSetupWizardDreamingAbout')).toHaveTextContent(
      'Solutions from resolved tickets.'
    );
    expect(screen.getByTestId('contextDreamingConfigFact-solution')).toBeInTheDocument();
    expect(screen.getByTestId('contextSetupWizardContinue')).toBeEnabled();
    expect(screen.queryByTestId('contextSetupWizardSkip')).not.toBeInTheDocument();
  });

  it('shows the description filled from the template, and entities off', () => {
    renderStep();

    pickTemplate('customer_support');

    expect(screen.getByTestId('contextSetupWizardDreamingSummary')).toHaveValue(
      'Customer support knowledge base.'
    );
    expect(screen.getByTestId('contextDreamingConfigEntitiesSwitch')).not.toBeChecked();
  });

  it('offers Skip again with a hint when dreaming would learn nothing', () => {
    renderStep();

    pickTemplate('legal_assistant');
    fireEvent.click(screen.getByRole('button', { name: 'Delete obligation' }));

    expect(screen.getByTestId('contextSetupWizardDreamingLearnsNothing')).toHaveTextContent(
      'Add a fact type, or turn on entities'
    );
    expect(screen.getByTestId('contextSetupWizardSkip')).toBeEnabled();
    expect(screen.queryByTestId('contextSetupWizardContinue')).not.toBeInTheDocument();
  });

  it('starts from scratch with no fact types', () => {
    renderStep();

    pickTemplate('custom');

    expect(screen.queryByTestId(/^contextDreamingConfigFact-/)).not.toBeInTheDocument();
    expect(screen.getByTestId('contextSetupWizardSkip')).toBeEnabled();

    fireEvent.click(screen.getByTestId('contextDreamingConfigEntitiesSwitch'));

    // Entities on with no entity types still learns nothing.
    expect(screen.getByTestId('contextSetupWizardSkip')).toBeEnabled();
  });

  it('Continue saves the picked template with the edited description', async () => {
    const { onContinue } = renderStep();

    pickTemplate('customer_support');
    fireEvent.change(screen.getByTestId('contextSetupWizardDreamingSummary'), {
      target: { value: 'Acme support.' },
    });
    fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

    const [save] = jest.mocked(onContinue).mock.calls[0];
    expect(await save?.()).toBe(true);
    expect(mockApplyTemplate).toHaveBeenCalledWith({
      aiIndexId: testAiIndex.id,
      config: {
        instructions: 'Acme support.\n\nRecord confirmed fixes.',
        facts: SUPPORT.dreaming.facts,
        entities: null,
        relationships: [],
      },
    });
  });

  it('reports a failed save, so the wizard stays on the step', async () => {
    mockApplyTemplate.mockResolvedValue(false);
    const { onContinue } = renderStep();

    pickTemplate('customer_support');
    fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

    const [save] = jest.mocked(onContinue).mock.calls[0];
    expect(await save?.()).toBe(false);
  });

  it('shows an error when the templates fail to load', () => {
    useDreamingTemplates.mockReturnValue({
      templates: [],
      isLoading: false,
      error: new Error('Boom'),
    });
    renderStep();

    expect(screen.getByTestId('contextDreamingTemplatesError')).toHaveTextContent('Boom');
    expect(screen.getByTestId('contextSetupWizardSkip')).toBeEnabled();
  });

  it('on a done step, links to Settings and Continue saves nothing', () => {
    const { onContinue } = renderStep({ isDone: true });

    expect(screen.getByTestId('contextSetupWizardDreamingSetUp')).toBeInTheDocument();
    expect(screen.getByTestId('contextSetupWizardDreamingSettingsLink')).toBeInTheDocument();
    expect(screen.queryByTestId('contextDreamingTemplateOption-customer_support')).toBeNull();

    fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

    expect(onContinue).toHaveBeenCalledWith(undefined);
  });
});
