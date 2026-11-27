/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { SetupWizard } from './setup_wizard';
import { SetupWizardStepLayout } from './setup_wizard_step_layout';
import { createTestStep, renderWithServices, testAiIndex } from './test_utils';
import type { SetupWizardStep } from './types';

const mockSave = jest.fn<Promise<boolean>, []>();

// A step that saves its draft on Continue.
const savingStep = createTestStep({
  id: 'saving',
  Content: ({ layout }) => (
    <SetupWizardStepLayout {...layout} canContinue onSave={mockSave}>
      <div />
    </SetupWizardStepLayout>
  ),
});

// A step that saves on its own, like Sources.
let reportBusy: (isBusy: boolean) => void = () => {};
const busyStep = createTestStep({
  id: 'busy',
  Content: ({ layout, onBusyChange }) => {
    reportBusy = onBusyChange;
    return (
      <SetupWizardStepLayout {...layout}>
        <div />
      </SetupWizardStepLayout>
    );
  },
});

const DraftStepContent: SetupWizardStep['Content'] = ({ layout }) => {
  const [draft, setDraft] = useState('');
  return (
    <SetupWizardStepLayout {...layout}>
      <input aria-label="Draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
    </SetupWizardStepLayout>
  );
};

const steps: readonly SetupWizardStep[] = [
  createTestStep({ id: 'a' }),
  createTestStep({ id: 'b' }),
  createTestStep({ id: 'c' }),
];

type WizardProps = React.ComponentProps<typeof SetupWizard>;

/** Holds the current step the way local storage does in the app: the wizard only reads it. */
const ControlledWizard = ({ currentStepId: startStepId, onStepChange, ...props }: WizardProps) => {
  const [currentStepId, setCurrentStepId] = useState(startStepId);
  return (
    <SetupWizard
      {...props}
      currentStepId={currentStepId}
      onStepChange={(stepId) => {
        onStepChange(stepId);
        setCurrentStepId(stepId);
      }}
    />
  );
};

const renderWizard = ({
  initialStepId = 'a',
  doneStepIds = [],
  ...props
}: Partial<Omit<WizardProps, 'currentStepId' | 'doneStepIds'>> & {
  initialStepId?: string;
  doneStepIds?: string[];
} = {}) => {
  const onStepChange = jest.fn();
  const onClose = jest.fn();
  const onSaved = jest.fn().mockResolvedValue(undefined);
  const services = renderWithServices(
    <ControlledWizard
      aiIndex={testAiIndex}
      steps={steps}
      currentStepId={initialStepId}
      doneStepIds={new Set(doneStepIds)}
      onStepChange={onStepChange}
      onClose={onClose}
      onSaved={onSaved}
      {...props}
    />
  );
  return { onStepChange, onClose, onSaved, services };
};

const boom = new Error('boom');

const finishedToast = 'Setup finished. You can change any of it in Settings.';

describe('SetupWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue(true);
  });

  it('shows every step in the steps bar and opens the current step', () => {
    renderWizard({ initialStepId: 'b' });

    steps.forEach(({ id }) => {
      expect(screen.getByTestId(`contextSetupWizardStep-${id}`)).toBeInTheDocument();
    });
    expect(screen.getByTestId('contextSetupWizardPanel-b')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Title b' })).toBeInTheDocument();
  });

  it('shows the step state to screen readers', () => {
    renderWizard({ initialStepId: 'b', doneStepIds: ['a'] });

    expect(screen.getByTestId('contextSetupWizardStep-a')).toHaveAccessibleName(
      expect.stringMatching(/complete/i)
    );
  });

  it('marks the earlier steps that are not done as skipped', () => {
    renderWizard({ initialStepId: 'c', doneStepIds: ['b'] });

    expect(screen.getByTestId('contextSetupWizardStep-a')).toHaveAccessibleName(
      'Step 1: Step a, skipped'
    );
    // No warning icon: skipping is fine, so a skipped step looks like any step that is not done.
    expect(screen.getByTestId('contextSetupWizardStep-a')).toHaveAttribute(
      'data-step-status',
      'incomplete'
    );
    expect(screen.getByTestId('contextSetupWizardStep-b')).toHaveAccessibleName(
      expect.stringMatching(/complete/i)
    );
  });

  it('skipped marks follow the current step, so going back clears them', () => {
    renderWizard({ initialStepId: 'c' });

    fireEvent.click(screen.getByTestId('contextSetupWizardStep-a'));

    expect(screen.getByTestId('contextSetupWizardStep-b')).toHaveAccessibleName(
      expect.stringMatching(/incomplete/i)
    );
  });

  it('tells which step a click in the steps bar went to', () => {
    renderWizard();

    expect(screen.getByTestId('contextSetupWizardStep-c')).toHaveAttribute('data-ebt-detail', 'c');
  });

  it('clicking a step opens it', () => {
    const { onStepChange } = renderWizard();

    fireEvent.click(screen.getByTestId('contextSetupWizardStep-c'));

    expect(screen.getByTestId('contextSetupWizardPanel-c')).toBeInTheDocument();
    expect(onStepChange).toHaveBeenCalledWith('c');
  });

  it('Continue on a done step opens the next step', () => {
    const { onStepChange } = renderWizard({ doneStepIds: ['a'] });

    fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

    expect(screen.getByTestId('contextSetupWizardPanel-b')).toBeInTheDocument();
    expect(onStepChange).toHaveBeenCalledWith('b');
  });

  it('Skip opens the next step', () => {
    const { onStepChange, onClose } = renderWizard();

    fireEvent.click(screen.getByTestId('contextSetupWizardSkip'));

    expect(screen.getByTestId('contextSetupWizardPanel-b')).toBeInTheDocument();
    expect(onStepChange).toHaveBeenCalledWith('b');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Skip jumps over steps that are already done', () => {
    const { onStepChange } = renderWizard({ doneStepIds: ['b'] });

    fireEvent.click(screen.getByTestId('contextSetupWizardSkip'));

    expect(onStepChange).toHaveBeenCalledWith('c');
  });

  it('finishes setup when every later step is done', () => {
    const { onClose, services } = renderWizard({ doneStepIds: ['b', 'c'] });

    expect(screen.getByTestId('contextSetupWizardSkip')).toHaveTextContent('Skip and finish');
    expect(screen.getByTestId('contextSetupWizardContinue')).toHaveTextContent('Finish setup');

    fireEvent.click(screen.getByTestId('contextSetupWizardSkip'));

    expect(onClose).toHaveBeenCalled();
    expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(finishedToast);
  });

  it('Back opens the previous step, and the first step has no Back', () => {
    const { onStepChange } = renderWizard({ initialStepId: 'b' });

    fireEvent.click(screen.getByTestId('contextSetupWizardBack'));

    expect(onStepChange).toHaveBeenCalledWith('a');
    expect(screen.getByTestId('contextSetupWizardPanel-a')).toBeInTheDocument();
    expect(screen.queryByTestId('contextSetupWizardBack')).not.toBeInTheDocument();
  });

  it('Exit setup closes the wizard with a toast', () => {
    const { onClose, services } = renderWizard();

    fireEvent.click(screen.getByTestId('contextSetupWizardExit'));

    expect(onClose).toHaveBeenCalled();
    expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      'Setup closed. Everything is in Settings when you need it.'
    );
  });

  it('a step starts with a fresh draft after a step change', () => {
    renderWizard({
      steps: [createTestStep({ id: 'draft', Content: DraftStepContent }), ...steps],
      initialStepId: 'draft',
    });

    fireEvent.change(screen.getByRole('textbox', { name: 'Draft' }), {
      target: { value: 'Not saved' },
    });
    fireEvent.click(screen.getByTestId('contextSetupWizardStep-a'));
    fireEvent.click(screen.getByTestId('contextSetupWizardStep-draft'));

    expect(screen.getByRole('textbox', { name: 'Draft' })).toHaveValue('');
  });

  describe('a step that saves on Continue', () => {
    it('saves, reloads the AI index, then opens the next step instead of finishing', async () => {
      const { onClose, onSaved, onStepChange } = renderWizard({
        steps: [savingStep, ...steps],
        initialStepId: 'saving',
      });

      fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

      await waitFor(() => expect(onStepChange).toHaveBeenCalledWith('a'));
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(onSaved).toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('finishes setup when it is the last open step', async () => {
      const { onClose, services } = renderWizard({
        steps: [...steps, savingStep],
        initialStepId: 'saving',
      });

      fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(finishedToast);
    });

    it('holds every button until the AI index is reloaded, so it cannot run twice', async () => {
      let resolveSaved: () => void = () => {};
      const onSaved = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSaved = resolve;
          })
      );
      const { onClose } = renderWizard({
        steps: [...steps, savingStep],
        initialStepId: 'saving',
        onSaved,
      });

      fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(screen.getByTestId('contextSetupWizardContinue')).toBeDisabled();
      expect(screen.getByTestId('contextSetupWizardSkip')).toBeDisabled();
      expect(screen.getByTestId('contextSetupWizardBack')).toBeDisabled();
      expect(screen.getByTestId('contextSetupWizardExit')).toBeDisabled();
      expect(onClose).not.toHaveBeenCalled();

      await act(async () => resolveSaved());
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('stays on the step when saving fails', async () => {
      mockSave.mockResolvedValue(false);
      const { onClose, onSaved, onStepChange } = renderWizard({
        steps: [savingStep, ...steps],
        initialStepId: 'saving',
      });

      fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

      await waitFor(() => expect(screen.getByTestId('contextSetupWizardContinue')).toBeEnabled());
      expect(mockSave).toHaveBeenCalled();
      expect(onSaved).not.toHaveBeenCalled();
      expect(onStepChange).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it.each([
      ['the save', { save: () => Promise.reject(boom), reload: () => Promise.resolve() }],
      ['the reload', { save: () => Promise.resolve(true), reload: () => Promise.reject(boom) }],
    ])('shows an error and frees the buttons when %s throws', async (_label, { save, reload }) => {
      mockSave.mockImplementation(save);
      const { onClose, onStepChange, services } = renderWizard({
        steps: [savingStep, ...steps],
        initialStepId: 'saving',
        onSaved: jest.fn(reload),
      });

      fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

      await waitFor(() =>
        expect(services.notifications.toasts.addError).toHaveBeenCalledWith(boom, {
          title: 'Unable to save this step',
        })
      );
      expect(screen.getByTestId('contextSetupWizardContinue')).toBeEnabled();
      expect(onStepChange).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it('while a step saves on its own, every button is held and the steps bar ignores clicks', () => {
    const { onStepChange } = renderWizard({
      steps: [...steps, busyStep],
      initialStepId: 'busy',
      doneStepIds: ['b'],
    });

    act(() => reportBusy(true));

    expect(screen.getByTestId('contextSetupWizardContinue')).toBeDisabled();
    expect(screen.getByTestId('contextSetupWizardSkip')).toBeDisabled();
    expect(screen.getByTestId('contextSetupWizardBack')).toBeDisabled();
    expect(screen.getByTestId('contextSetupWizardExit')).toBeDisabled();
    expect(screen.getByTestId('contextSetupWizardStep-busy')).toHaveAttribute(
      'data-step-status',
      'current'
    );
    expect(screen.getByTestId('contextSetupWizardStep-b')).toHaveAttribute(
      'data-step-status',
      'complete'
    );

    fireEvent.click(screen.getByTestId('contextSetupWizardStep-a'));
    expect(onStepChange).not.toHaveBeenCalled();

    act(() => reportBusy(false));
    fireEvent.click(screen.getByTestId('contextSetupWizardStep-a'));

    expect(onStepChange).toHaveBeenCalledWith('a');
  });

  describe('focus', () => {
    it('does not move focus on the first render', () => {
      renderWizard({ initialStepId: 'b' });

      expect(screen.getByRole('heading', { name: 'Title b' })).not.toHaveFocus();
      expect(document.body).toHaveFocus();
    });

    it('moves focus to the new step heading after Skip', () => {
      renderWizard();

      fireEvent.click(screen.getByTestId('contextSetupWizardSkip'));

      expect(screen.getByRole('heading', { name: 'Title b' })).toHaveFocus();
    });

    it('moves focus to the new step heading after a click on a step', () => {
      renderWizard();

      fireEvent.click(screen.getByTestId('contextSetupWizardStep-c'));

      expect(screen.getByRole('heading', { name: 'Title c' })).toHaveFocus();
    });
  });
});
