/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import { SetupWizardStepLayout } from './setup_wizard_step_layout';
import { createTestLayoutControls, createTestStep, renderWithServices } from './test_utils';
import type { SetupWizardStepLayoutControls } from './types';

type LayoutProps = React.ComponentProps<typeof SetupWizardStepLayout>;

const step = createTestStep({ id: 'a' });

const renderLayout = ({
  controls,
  ...props
}: Partial<Omit<LayoutProps, keyof SetupWizardStepLayoutControls>> & {
  controls?: Partial<SetupWizardStepLayoutControls>;
} = {}) => {
  const layout = createTestLayoutControls(controls?.step ?? step, controls);
  renderWithServices(
    <SetupWizardStepLayout {...layout} {...props}>
      <div data-test-subj="stepBody" />
    </SetupWizardStepLayout>
  );
  return layout;
};

const { setupWizard: ebtAction } = CONTEXT_ENGINE_UI_EBT.action;

describe('SetupWizardStepLayout', () => {
  it('shows the step heading, description, docs link and body', () => {
    renderLayout();

    expect(screen.getByRole('heading', { name: 'Title a' })).toBeInTheDocument();
    expect(screen.getByText(/Description a/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Docs a/ })).toBeInTheDocument();
    expect(screen.getByTestId('stepBody')).toBeInTheDocument();
  });

  it('does not announce changes inside the step body as a live region', () => {
    renderLayout();

    expect(screen.getByTestId('contextSetupWizardPanel-a').querySelector('[aria-live]')).toBeNull();
  });

  it('shows the Optional badge only on an optional step', () => {
    renderLayout({ controls: { step: createTestStep({ id: 'opt', isOptional: true }) } });

    expect(screen.getByTestId('contextSetupWizardOptionalBadge')).toHaveTextContent('Optional');
  });

  it('has no Optional badge on a required step', () => {
    renderLayout();

    expect(screen.queryByTestId('contextSetupWizardOptionalBadge')).not.toBeInTheDocument();
  });

  it('has no Back button on the first step', () => {
    renderLayout({ controls: { isFirstStep: true } });

    expect(screen.queryByTestId('contextSetupWizardBack')).not.toBeInTheDocument();
  });

  it('tells which step each click came from', () => {
    renderLayout();

    ['Exit', 'Back', 'Skip'].forEach((name) => {
      expect(screen.getByTestId(`contextSetupWizard${name}`)).toHaveAttribute(
        'data-ebt-detail',
        'a'
      );
    });
    expect(screen.getByRole('link', { name: /Docs a/ })).toHaveAttribute('data-ebt-detail', 'a');
    expect(screen.getByTestId('contextSetupWizardBack')).toHaveAttribute(
      'data-ebt-action',
      ebtAction.BACK
    );
  });

  it.each([
    [
      'a step that is not done and has no changes',
      false,
      false,
      'Skip',
      ebtAction.SKIP,
      'Continue',
    ],
    ['a step with changes', false, true, 'Continue', ebtAction.CONTINUE, 'Skip'],
    ['a step that is done', true, false, 'Continue', ebtAction.CONTINUE, 'Skip'],
  ])(
    'shows one primary button on %s, and its click is tracked as that button',
    (_label, isDone, hasChanges, shown, action, hidden) => {
      renderLayout({ controls: { isDone }, hasChanges });

      const button = screen.getByTestId(`contextSetupWizard${shown}`);
      expect(button).toHaveAttribute('data-ebt-action', action);
      expect(button).toHaveAttribute('data-ebt-detail', 'a');
      expect(screen.queryByTestId(`contextSetupWizard${hidden}`)).not.toBeInTheDocument();
    }
  );

  it.each([
    [false, 'Skip', 'Skip and finish', ebtAction.SKIP_AND_FINISH],
    [true, 'Continue', 'Finish setup', ebtAction.FINISH],
  ])('on the last open step (done: %s), %s finishes setup', (isDone, button, label, action) => {
    renderLayout({ controls: { isLastStep: true, isDone } });

    expect(screen.getByTestId(`contextSetupWizard${button}`)).toHaveTextContent(label);
    expect(screen.getByTestId(`contextSetupWizard${button}`)).toHaveAttribute(
      'data-ebt-action',
      action
    );
  });

  it.each([
    ['a required step with changes', {}, false],
    ['a required step that is done', { isDone: true }, true],
    [
      'an optional step with changes',
      { step: createTestStep({ id: 'opt', isOptional: true }) },
      true,
    ],
  ])('Continue on %s: enabled is %s', (_label, controls, isEnabled) => {
    renderLayout({ controls, hasChanges: true });

    expect(screen.getByTestId('contextSetupWizardContinue').hasAttribute('disabled')).toBe(
      !isEnabled
    );
  });

  it('lets the step decide when Continue works', () => {
    renderLayout({ controls: { isDone: true }, canContinue: false });

    expect(screen.getByTestId('contextSetupWizardContinue')).toBeDisabled();
  });

  it.each([
    ['saves the changes', true, true],
    ['saves nothing without changes', false, false],
  ])('Continue on a done step %s', (_label, hasChanges, isSaved) => {
    const onSave = jest.fn();
    const { onContinue } = renderLayout({ controls: { isDone: true }, hasChanges, onSave });

    fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

    expect(onContinue).toHaveBeenCalledWith(isSaved ? onSave : undefined);
  });

  it('calls Back, Skip and Exit', () => {
    const { onBack, onSkip, onExit } = renderLayout();

    fireEvent.click(screen.getByTestId('contextSetupWizardBack'));
    fireEvent.click(screen.getByTestId('contextSetupWizardSkip'));
    fireEvent.click(screen.getByTestId('contextSetupWizardExit'));

    expect(onBack).toHaveBeenCalled();
    expect(onSkip).toHaveBeenCalled();
    expect(onExit).toHaveBeenCalled();
  });
});
