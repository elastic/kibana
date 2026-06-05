/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { AWS_PERMISSIONS_VIEWER_TEST_SUBJ, AwsPermissionsViewer } from './aws_permissions_viewer';
import type { AwsServicePermissions } from '../service_permissions';

const MOCK_SERVICES: AwsServicePermissions[] = [
  {
    id: 'service_a',
    name: 'Service A',
    actions: ['s3:GetObject', 's3:ListBucket'],
  },
  {
    id: 'service_b',
    name: 'Service B',
    actions: ['s3:GetObject', 'sqs:ReceiveMessage'],
  },
];

const renderViewer = (services: AwsServicePermissions[] = MOCK_SERVICES) =>
  render(
    <I18nProvider>
      <AwsPermissionsViewer services={services} />
    </I18nProvider>
  );

describe('AwsPermissionsViewer', () => {
  it('renders nothing when services is empty', () => {
    const { container } = renderViewer([]);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the panel title and aggregated IAM policy JSON by default', () => {
    renderViewer();

    expect(screen.getByText('Required IAM permissions')).toBeInTheDocument();
    expect(screen.getByTestId(`${AWS_PERMISSIONS_VIEWER_TEST_SUBJ}-titleIcon`)).toBeInTheDocument();
    expect(
      screen.getByText("Attach this policy to the IAM user whose access keys you'll enter below.")
    ).toBeInTheDocument();

    const actionsList = screen.getByTestId(`${AWS_PERMISSIONS_VIEWER_TEST_SUBJ}-actionsList`);
    expect(actionsList).toHaveTextContent('"Version": "2012-10-17"');
    expect(actionsList).toHaveTextContent('"Sid": "ElasticAWSIntegration"');
    expect(actionsList).toHaveTextContent('"s3:GetObject"');
    expect(actionsList).toHaveTextContent('"s3:ListBucket"');
    expect(actionsList).toHaveTextContent('"sqs:ReceiveMessage"');
  });

  it('narrows the policy and Sid when an individual integration is selected', () => {
    renderViewer();

    fireEvent.change(screen.getByTestId(`${AWS_PERMISSIONS_VIEWER_TEST_SUBJ}-serviceSelector`), {
      target: { value: 'service_a' },
    });

    const actionsList = screen.getByTestId(`${AWS_PERMISSIONS_VIEWER_TEST_SUBJ}-actionsList`);
    expect(actionsList).toHaveTextContent('"Sid": "ElasticServiceA"');
    expect(actionsList).toHaveTextContent('"s3:GetObject"');
    expect(actionsList).toHaveTextContent('"s3:ListBucket"');
    expect(actionsList).not.toHaveTextContent('"sqs:ReceiveMessage"');
  });

  it('disambiguates integrations with duplicate names in the dropdown', () => {
    const duplicateNameServices: AwsServicePermissions[] = [
      {
        id: 's3_access_logs',
        name: 'AWS S3',
        actions: ['s3:GetObject'],
      },
      {
        id: 's3_inventory',
        name: 'AWS S3',
        actions: ['s3:ListBucket'],
      },
    ];

    renderViewer(duplicateNameServices);

    expect(screen.getByRole('option', { name: 'AWS S3 (s3_access_logs)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'AWS S3 (s3_inventory)' })).toBeInTheDocument();
  });

  it('includes the all integrations option in the dropdown', () => {
    renderViewer();

    expect(screen.getByRole('option', { name: 'All integrations' })).toBeInTheDocument();
  });

  it('defaults to the all integrations option value', () => {
    renderViewer();

    expect(screen.getByTestId(`${AWS_PERMISSIONS_VIEWER_TEST_SUBJ}-serviceSelector`)).toHaveValue(
      '__all__'
    );
  });
});
