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

    ['Exit', 'Back', 'Skip', 'Continue'].forEach((name) => {
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

  it('labels Skip and Continue as finishing on the last open step', () => {
    renderLayout({ controls: { isLastStep: true, isDone: true } });

    expect(screen.getByTestId('contextSetupWizardSkip')).toHaveTextContent('Skip and finish');
    expect(screen.getByTestId('contextSetupWizardSkip')).toHaveAttribute(
      'data-ebt-action',
      ebtAction.SKIP_AND_FINISH
    );
    expect(screen.getByTestId('contextSetupWizardContinue')).toHaveTextContent('Finish setup');
    expect(screen.getByTestId('contextSetupWizardContinue')).toHaveAttribute(
      'data-ebt-action',
      ebtAction.FINISH
    );
  });

  it.each([
    ['a required step that is not done', { isDone: false }, false],
    ['a required step that is done', { isDone: true }, true],
    [
      'an optional step that is not done',
      { step: createTestStep({ id: 'opt', isOptional: true }) },
      true,
    ],
  ])('Continue on %s: enabled is %s', (_label, controls, isEnabled) => {
    renderLayout({ controls });

    expect(screen.getByTestId('contextSetupWizardContinue').hasAttribute('disabled')).toBe(
      !isEnabled
    );
  });

  it('lets the step decide when Continue works', () => {
    renderLayout({ controls: { isDone: true }, canContinue: false });

    expect(screen.getByTestId('contextSetupWizardContinue')).toBeDisabled();
  });

  it('passes the step save to Continue', () => {
    const onSave = jest.fn();
    const { onContinue } = renderLayout({ controls: { isDone: true }, onSave });

    fireEvent.click(screen.getByTestId('contextSetupWizardContinue'));

    expect(onContinue).toHaveBeenCalledWith(onSave);
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
