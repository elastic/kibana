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

const commandToggles = () => screen.getAllByRole('button', { name: /command$/ });

describe('FederatedIdentityManualSetup', () => {
  it('lists the steps in order with their descriptions', () => {
    renderManualSetup();

    expect(screen.getByText('Run the commands below in order.')).toBeInTheDocument();
    expect(
      screen.getAllByRole('heading', { name: /Create the (identity provider|read policy)/ }).length
    ).toBe(2);
    expect(screen.getByText('Read access is scoped to one bucket.')).toBeInTheDocument();
  });

  // The role can already exist, leaving the user only its ARN to paste.
  it('keeps every command collapsed initially', () => {
    renderManualSetup();

    for (const toggle of commandToggles()) {
      expect(toggle).toHaveTextContent('Show command');
    }
  });

  // The steps run in order, so opening a later command collapses the earlier one.
  it('keeps only one command open at a time', () => {
    renderManualSetup();

    fireEvent.click(commandToggles()[0]);
    fireEvent.click(commandToggles()[1]);

    const [first, second] = commandToggles();
    expect(first).toHaveTextContent('Show command');
    expect(second).toHaveTextContent('Hide command');
  });

  it('collapses the open command when its toggle is clicked again', () => {
    renderManualSetup();

    fireEvent.click(commandToggles()[0]);
    expect(commandToggles()[0]).toHaveTextContent('Hide command');

    fireEvent.click(commandToggles()[0]);
    expect(commandToggles()[0]).toHaveTextContent('Show command');
  });
});
