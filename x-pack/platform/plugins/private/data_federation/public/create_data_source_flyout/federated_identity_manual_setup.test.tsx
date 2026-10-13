/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';

import { FederatedIdentityManualSetup } from './federated_identity_manual_setup';

const steps = [
  {
    id: 'first',
    title: 'Create the identity provider',
    description: 'Skip this step if you already have one.',
    command: 'aws iam create-open-id-connect-provider',
    lineNumbers: { highlight: '1', annotations: { 1: 'Leave this value unchanged.' } },
  },
  {
    id: 'second',
    title: 'Create the read policy',
    description: 'Read access is scoped to one bucket.',
    command: 'aws iam create-policy',
    lineNumbers: { highlight: '1', annotations: { 1: 'Replace with your bucket name.' } },
  },
];

const renderManualSetup = () =>
  render(
    <EuiProvider>
      <FederatedIdentityManualSetup
        intro="Run the commands below in order."
        steps={steps}
        testSubjPrefix="testPrefix"
      />
    </EuiProvider>
  );

const toggle = (id: string) => screen.getByTestId(`testPrefixManualStepCommandToggle-${id}`);

describe('FederatedIdentityManualSetup', () => {
  it('renders one step per entry, in order', () => {
    renderManualSetup();

    const renderedSteps = screen.getAllByTestId(/testPrefixManualStep-/);
    expect(renderedSteps.map((step) => step.getAttribute('data-test-subj'))).toEqual([
      'testPrefixManualStep-first',
      'testPrefixManualStep-second',
    ]);
  });

  // The role can already exist, leaving the user only its ARN to paste.
  it('keeps every command collapsed initially', () => {
    renderManualSetup();

    expect(toggle('first')).toHaveAttribute('aria-expanded', 'false');
    expect(toggle('second')).toHaveAttribute('aria-expanded', 'false');
  });

  // The steps run in order, so opening a later command collapses the earlier one.
  it('keeps only one command open at a time', () => {
    renderManualSetup();

    fireEvent.click(toggle('first'));
    fireEvent.click(toggle('second'));

    expect(toggle('first')).toHaveAttribute('aria-expanded', 'false');
    expect(toggle('second')).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses the open command when its toggle is clicked again', () => {
    renderManualSetup();

    fireEvent.click(toggle('first'));
    expect(toggle('first')).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle('first'));
    expect(toggle('first')).toHaveAttribute('aria-expanded', 'false');
  });
});
