/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import type { SetupWizardProgress } from '../../../../utils/setup_wizard_view';
import { createTestLayoutControls, renderWithServices, testAiIndex } from '../test_utils';
import { describeStep } from './describe_step';

jest.mock('../../../../hooks/use_save_ai_index_description');

const { useSaveAiIndexDescription } = jest.requireMock(
  '../../../../hooks/use_save_ai_index_description'
);

const mockSaveDescription = jest.fn();

const renderStep = ({ aiIndex = testAiIndex, isDone = false, isBusy = false } = {}) => {
  const layout = createTestLayoutControls(describeStep, { isDone, isBusy });
  const { Content } = describeStep;
  renderWithServices(
    <Content aiIndex={aiIndex} onSaved={jest.fn()} onBusyChange={jest.fn()} layout={layout} />
  );
  return layout;
};

const typeDescription = (value: string) =>
  fireEvent.change(screen.getByTestId('contextSetupWizardDescription'), { target: { value } });

const progress: SetupWizardProgress = {
  aiIndex: testAiIndex,
  dreaming: undefined,
  memoryCount: 0,
  isMemoryEnabled: true,
};

describe('describeStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveDescription.mockResolvedValue(true);
    useSaveAiIndexDescription.mockReturnValue({
      saveDescription: mockSaveDescription,
      isSaving: false,
    });
  });

  it.each([
    [undefined, false],
    ['   ', false],
    ['Answers questions about checkouts.', true],
  ])('with the description %p, is done: %s', (description, isDone) => {
    expect(describeStep.isDone({ ...progress, aiIndex: { ...testAiIndex, description } })).toBe(
      isDone
    );
  });

  it('shows the description field and no name field', () => {
    renderStep();

    expect(screen.getByTestId('contextSetupWizardDescription')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /name/i })).not.toBeInTheDocument();
  });

  it('offers Skip while the description is empty, with no message', () => {
    renderStep();

    expect(screen.getByTestId('contextSetupWizardSkip')).toBeEnabled();
    expect(screen.queryByTestId('contextSetupWizardContinue')).not.toBeInTheDocument();
    expect(screen.queryByText('Enter a description.')).not.toBeInTheDocument();
  });

  it('offers Skip again when the typed text is removed', () => {
    renderStep();

    typeDescription('Checkout failures.');
    expect(screen.getByTestId('contextSetupWizardContinue')).toBeEnabled();

    typeDescription('');
    expect(screen.getByTestId('contextSetupWizardSkip')).toBeEnabled();
  });

  it('Continue on a saved description that is not changed saves nothing', () => {
    const { onContinue } = renderStep({
      aiIndex: { ...testAiIndex, description: 'Checkout failures.' },
      isDone: true,
    });

    fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

    expect(onContinue).toHaveBeenCalledWith(undefined);
  });

  it('explains why Continue is off when the description is only spaces', () => {
    renderStep();

    typeDescription('   ');

    expect(screen.getByText('Enter a description.')).toBeInTheDocument();
    expect(screen.getByTestId('contextSetupWizardContinue')).toBeDisabled();

    typeDescription('Checkout failures.');

    expect(screen.queryByText('Enter a description.')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextSetupWizardContinue')).toBeEnabled();
  });

  it('locks the description while the wizard saves', () => {
    renderStep({ isBusy: true });

    expect(screen.getByTestId('contextSetupWizardDescription')).toBeDisabled();
  });

  it('Continue saves the trimmed description', async () => {
    const { onContinue } = renderStep();

    typeDescription('  Answers questions about failed checkouts.  ');
    fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

    const [save] = jest.mocked(onContinue).mock.calls[0];
    expect(await save?.()).toBe(true);
    expect(mockSaveDescription).toHaveBeenCalledWith(
      testAiIndex,
      'Answers questions about failed checkouts.'
    );
  });
});
