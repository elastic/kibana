/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { CloudFormationCloudCredentialsGuide } from './aws_cloud_formation_guide';

const renderGuide = (props: React.ComponentProps<typeof CloudFormationCloudCredentialsGuide>) =>
  render(
    <I18nProvider>
      <CloudFormationCloudCredentialsGuide {...props} />
    </I18nProvider>
  );

const lastStepText = () => {
  const steps = screen.getAllByRole('listitem');
  return steps[steps.length - 1].textContent;
};

describe('CloudFormationCloudCredentialsGuide', () => {
  it('asks only for the Role ARN by default', () => {
    renderGuide({});

    expect(lastStepText()).toBe('Copy Role ARN then paste it below');
  });

  it('asks for the External ID too when the form has that field', () => {
    renderGuide({ hasExternalId: true });

    expect(lastStepText()).toBe(
      'Copy Role ARN and External ID then paste the role credentials below'
    );
  });

  it('asks for access keys for direct_access_keys, regardless of hasExternalId', () => {
    renderGuide({ credentialType: 'direct_access_keys', hasExternalId: true });

    expect(lastStepText()).toBe(
      'Copy Access Key ID and Secret Access Key then paste the credentials below'
    );
  });
});
