/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { FederatedIdentityDeployPanel } from './federated_identity_deploy_panel';

const config = {
  title: 'Deploy with AWS CloudFormation',
  description: 'Runs a stack in the AWS console.',
  launchUrl: 'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?a=b',
  launchButtonLabel: 'Launch CloudFormation template',
  createsTitle: 'What the template creates',
  createsItems: [
    { id: 'idp', label: 'An identity provider' },
    { id: 'role', label: 'A role' },
    { id: 'policy', label: 'A read policy' },
  ],
};

const renderPanel = () =>
  render(
    <EuiProvider>
      <FederatedIdentityDeployPanel config={config} testSubjPrefix="testPrefix" />
    </EuiProvider>
  );

describe('FederatedIdentityDeployPanel', () => {
  // The stack is created in the cloud provider's console, away from Kibana.
  it('opens the template in a new tab without leaking the referrer', () => {
    renderPanel();

    const launchButton = screen.getByRole('link', { name: /Launch CloudFormation template/ });
    expect(launchButton).toHaveAttribute('href', config.launchUrl);
    expect(launchButton).toHaveAttribute('target', '_blank');
    expect(launchButton).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('keeps the created resources behind a collapsed toggle', () => {
    renderPanel();

    expect(screen.getByText('What the template creates')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /What the template creates/ })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
});
