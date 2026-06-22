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
import type {
  AwsPermissionsViewerProps,
  AwsPermissionsViewerService,
} from './aws_permissions_viewer';
import { buildIamPolicyDocument } from '../../../common/iam_policy_document';

const SERVICE_A: AwsPermissionsViewerService = { id: 'service_a', name: 'Service A' };
const SERVICE_B: AwsPermissionsViewerService = { id: 'service_b', name: 'Service B' };

const MOCK_BY_SERVICE = {
  service_a: buildIamPolicyDocument(['s3:GetObject', 's3:ListBucket'], 'ElasticServiceA'),
  service_b: buildIamPolicyDocument(['s3:GetObject', 'sqs:ReceiveMessage'], 'ElasticServiceB'),
};

const MOCK_MERGED = buildIamPolicyDocument(['s3:GetObject', 's3:ListBucket', 'sqs:ReceiveMessage']);

const defaultProps: AwsPermissionsViewerProps = {
  byService: MOCK_BY_SERVICE,
  merged: MOCK_MERGED,
  services: [SERVICE_A, SERVICE_B],
};

const renderViewer = (props: Partial<AwsPermissionsViewerProps> = {}) =>
  render(
    <I18nProvider>
      <AwsPermissionsViewer {...defaultProps} {...props} />
    </I18nProvider>
  );

describe('AwsPermissionsViewer', () => {
  it('renders nothing when merged has no actions', () => {
    const { container } = renderViewer({
      merged: buildIamPolicyDocument([]),
      byService: {},
      services: [],
    });

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

  it('shows the per-service policy document when an individual integration is selected', () => {
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
    renderViewer({
      services: [
        { id: 's3_access_logs', name: 'AWS S3' },
        { id: 's3_inventory', name: 'AWS S3' },
      ],
      byService: {
        s3_access_logs: buildIamPolicyDocument(['s3:GetObject'], 'Elastics3accesslogs'),
        s3_inventory: buildIamPolicyDocument(['s3:ListBucket'], 'Elastics3inventory'),
      },
    });

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

  it('resets to all integrations when the selected service is removed from byService', () => {
    const { rerender } = renderViewer();

    fireEvent.change(screen.getByTestId(`${AWS_PERMISSIONS_VIEWER_TEST_SUBJ}-serviceSelector`), {
      target: { value: 'service_a' },
    });

    expect(screen.getByTestId(`${AWS_PERMISSIONS_VIEWER_TEST_SUBJ}-serviceSelector`)).toHaveValue(
      'service_a'
    );

    // Remove service_a from byService
    rerender(
      <I18nProvider>
        <AwsPermissionsViewer
          byService={{ service_b: MOCK_BY_SERVICE.service_b }}
          merged={buildIamPolicyDocument(['s3:GetObject', 'sqs:ReceiveMessage'])}
          services={[SERVICE_B]}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId(`${AWS_PERMISSIONS_VIEWER_TEST_SUBJ}-serviceSelector`)).toHaveValue(
      '__all__'
    );

    const actionsList = screen.getByTestId(`${AWS_PERMISSIONS_VIEWER_TEST_SUBJ}-actionsList`);
    expect(actionsList).toHaveTextContent('"Sid": "ElasticAWSIntegration"');
    expect(actionsList).toHaveTextContent('"sqs:ReceiveMessage"');
  });

  it('switches to the merged policy without a second request when all integrations is re-selected', () => {
    renderViewer();

    // Select a single service
    fireEvent.change(screen.getByTestId(`${AWS_PERMISSIONS_VIEWER_TEST_SUBJ}-serviceSelector`), {
      target: { value: 'service_a' },
    });

    // Switch back to all integrations — uses merged, no refetch
    fireEvent.change(screen.getByTestId(`${AWS_PERMISSIONS_VIEWER_TEST_SUBJ}-serviceSelector`), {
      target: { value: '__all__' },
    });

    const actionsList = screen.getByTestId(`${AWS_PERMISSIONS_VIEWER_TEST_SUBJ}-actionsList`);
    expect(actionsList).toHaveTextContent('"Sid": "ElasticAWSIntegration"');
    expect(actionsList).toHaveTextContent('"s3:ListBucket"');
    expect(actionsList).toHaveTextContent('"sqs:ReceiveMessage"');
  });
});
