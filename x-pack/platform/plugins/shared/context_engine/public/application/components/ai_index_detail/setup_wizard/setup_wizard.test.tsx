/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import type { SetupWizardDoneSteps, SetupWizardStepId } from '../../../utils/setup_wizard';
import { SetupWizard } from './setup_wizard';

jest.mock('../../../hooks/use_save_ai_index_description');

const { useSaveAiIndexDescription } = jest.requireMock(
  '../../../hooks/use_save_ai_index_description'
);

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const noneDone: SetupWizardDoneSteps = {
  dreaming: false,
  connect: false,
  sources: false,
  describe: false,
};

const allSteps: readonly SetupWizardStepId[] = ['dreaming', 'connect', 'sources', 'describe'];

const mockSaveDescription = jest.fn();
let services: ReturnType<typeof coreMock.createStart>;

const renderWizard = (props: Partial<React.ComponentProps<typeof SetupWizard>> = {}) => {
  const onStepChange = jest.fn();
  const onClose = jest.fn();
  const onSaved = jest.fn().mockResolvedValue(undefined);
  services = coreMock.createStart();
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <SetupWizard
            aiIndex={aiIndex}
            steps={allSteps}
            initialStep="dreaming"
            done={noneDone}
            isMemoryEnabled={true}
            onStepChange={onStepChange}
            onClose={onClose}
            onSaved={onSaved}
            {...props}
          />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  return { onStepChange, onClose, onSaved };
};

describe('SetupWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveDescription.mockResolvedValue(true);
    useSaveAiIndexDescription.mockReturnValue({
      saveDescription: mockSaveDescription,
      isSaving: false,
    });
  });

  it('shows the 4 steps and opens the initial step', () => {
    renderWizard({ initialStep: 'connect' });

    allSteps.forEach((stepId) => {
      expect(screen.getByTestId(`contextSetupWizardStep-${stepId}`)).toBeInTheDocument();
    });
    expect(screen.getByTestId('contextSetupWizardPanel-connect')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Connect your agent' })).toBeInTheDocument();
  });

  it('shows only the steps it gets, so memory off has no dreaming step', () => {
    renderWizard({ steps: ['connect', 'sources', 'describe'], initialStep: 'connect' });

    expect(screen.queryByTestId('contextSetupWizardStep-dreaming')).not.toBeInTheDocument();
  });

  it('disables Continue until the step is done', () => {
    renderWizard({ initialStep: 'sources' });

    expect(screen.getByTestId('contextSetupWizardContinue')).toBeDisabled();
  });

  it('with memory off, Continue on Connect agent works, as no memory can arrive', () => {
    renderWizard({
      steps: ['connect', 'sources', 'describe'],
      initialStep: 'connect',
      isMemoryEnabled: false,
    });

    expect(screen.getByTestId('contextSetupWizardContinue')).toBeEnabled();
  });

  it('shows the step state to screen readers', () => {
    renderWizard({ initialStep: 'connect', done: { ...noneDone, dreaming: true } });

    expect(screen.getByTestId('contextSetupWizardStep-dreaming')).toHaveAccessibleName(
      expect.stringMatching(/complete/i)
    );
  });

  it('opening on a saved step marks the earlier steps that are not done as skipped', () => {
    renderWizard({ initialStep: 'sources', done: { ...noneDone, connect: true } });

    expect(screen.getByTestId('contextSetupWizardStep-dreaming')).toHaveAccessibleName(
      'Step 1: Shape dreaming, skipped'
    );
    // No warning icon: skipping is fine, so a skipped step looks like any step that is not done.
    expect(screen.getByTestId('contextSetupWizardStep-dreaming')).toHaveAttribute(
      'data-step-status',
      'incomplete'
    );
    expect(screen.getByTestId('contextSetupWizardStep-connect')).toHaveAccessibleName(
      expect.stringMatching(/complete/i)
    );
    expect(screen.getByTestId('contextSetupWizardStep-describe')).toHaveAccessibleName(
      expect.stringMatching(/incomplete/i)
    );
  });

  it('going back keeps the steps after it marked as skipped', () => {
    renderWizard({ initialStep: 'sources' });

    fireEvent.click(screen.getByTestId('contextSetupWizardStep-dreaming'));

    expect(screen.getByTestId('contextSetupWizardStep-connect')).toHaveAccessibleName(
      'Step 2: Connect agent, skipped'
    );
    expect(screen.getByTestId('contextSetupWizardStep-sources')).toHaveAccessibleName(
      expect.stringMatching(/incomplete/i)
    );
  });

  it('Continue opens the next step when the step is done', () => {
    const { onStepChange } = renderWizard({
      initialStep: 'sources',
      done: { ...noneDone, sources: true },
    });

    fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

    expect(screen.getByTestId('contextSetupWizardPanel-describe')).toBeInTheDocument();
    expect(onStepChange).toHaveBeenCalledWith('describe');
  });

  it('Skip opens the next step and saves nothing', () => {
    const { onStepChange, onClose } = renderWizard();

    fireEvent.click(screen.getByTestId('contextSetupWizardSkip'));

    expect(screen.getByTestId('contextSetupWizardPanel-connect')).toBeInTheDocument();
    expect(onStepChange).toHaveBeenCalledWith('connect');
    expect(onClose).not.toHaveBeenCalled();
    expect(mockSaveDescription).not.toHaveBeenCalled();
  });

  it('clicking a step opens it', () => {
    const { onStepChange } = renderWizard();

    fireEvent.click(screen.getByTestId('contextSetupWizardStep-describe'));

    expect(screen.getByTestId('contextSetupWizardPanel-describe')).toBeInTheDocument();
    expect(onStepChange).toHaveBeenCalledWith('describe');
  });

  it('Exit setup closes the wizard with a toast', () => {
    const { onClose } = renderWizard();

    fireEvent.click(screen.getByTestId('contextSetupWizardExit'));

    expect(onClose).toHaveBeenCalled();
    expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      'Setup closed. Everything is in Settings when you need it.'
    );
  });

  describe('Describe index step', () => {
    it('shows the description field and no name field', () => {
      renderWizard({ initialStep: 'describe' });

      expect(screen.getByTestId('contextSetupWizardDescription')).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: /name/i })).not.toBeInTheDocument();
      expect(screen.getByTestId('contextSetupWizardSkip')).toHaveTextContent('Skip and finish');
      expect(screen.getByTestId('contextSetupWizardContinue')).toHaveTextContent('Finish setup');
    });

    it('disables Finish setup while the description is empty', () => {
      renderWizard({ initialStep: 'describe' });

      expect(screen.getByTestId('contextSetupWizardContinue')).toBeDisabled();
    });

    it('Finish setup saves the description and closes the wizard', async () => {
      const { onClose, onSaved } = renderWizard({ initialStep: 'describe' });

      fireEvent.change(screen.getByTestId('contextSetupWizardDescription'), {
        target: { value: '  Answers questions about failed checkouts.  ' },
      });
      fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(mockSaveDescription).toHaveBeenCalledWith(
        aiIndex,
        'Answers questions about failed checkouts.'
      );
      expect(onSaved).toHaveBeenCalled();
      expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
        'Setup finished. You can change any of it in Settings.'
      );
    });

    it('keeps Finish setup busy until the data is reloaded, so it cannot be clicked twice', async () => {
      let resolveSaved: () => void = () => {};
      const onSaved = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSaved = resolve;
          })
      );
      const { onClose } = renderWizard({ initialStep: 'describe', onSaved });

      fireEvent.change(screen.getByTestId('contextSetupWizardDescription'), {
        target: { value: 'Answers questions about failed checkouts.' },
      });
      fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(screen.getByTestId('contextSetupWizardContinue')).toBeDisabled();
      expect(screen.getByTestId('contextSetupWizardSkip')).toBeDisabled();
      expect(screen.getByTestId('contextSetupWizardExit')).toBeDisabled();
      expect(onClose).not.toHaveBeenCalled();

      resolveSaved();
      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
      expect(mockSaveDescription).toHaveBeenCalledTimes(1);
    });

    it('keeps the wizard open when saving fails', async () => {
      mockSaveDescription.mockResolvedValue(false);
      const { onClose } = renderWizard({ initialStep: 'describe' });

      fireEvent.change(screen.getByTestId('contextSetupWizardDescription'), {
        target: { value: 'Answers questions about failed checkouts.' },
      });
      fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

      await waitFor(() => expect(mockSaveDescription).toHaveBeenCalled());
      expect(onClose).not.toHaveBeenCalled();
    });

    it('Skip and finish closes the wizard without saving', () => {
      const { onClose } = renderWizard({ initialStep: 'describe' });

      fireEvent.click(screen.getByTestId('contextSetupWizardSkip'));

      expect(onClose).toHaveBeenCalled();
      expect(mockSaveDescription).not.toHaveBeenCalled();
    });
  });
});
