/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';

import type { NewPackagePolicy, NewPackagePolicyInput, PackageInfo } from '../../../../common';
import {
  GCP_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ,
  GCP_INPUT_FIELDS_TEST_SUBJECTS,
  GCP_LAUNCH_CLOUD_CONNECTOR_CLOUD_SHELL_TEST_SUBJ,
} from '../../../../common/services/cloud_connectors/test_subjects';

import type { CloudConnectorFormProps } from '../types';

import { GCPCloudConnectorForm } from './gcp_cloud_connector_form';

// Mock the LazyPackagePolicyInputVarField
jest.mock('../../..', () => ({
  LazyPackagePolicyInputVarField: jest.fn(({ varDef, onChange, value }) => {
    // Extract the field name from the varDef - use the last part of multi_fields path or name
    const fieldName = varDef.multi_fields?.[0] || varDef.name || 'unknown';
    // Use hardcoded test subject values to avoid accessing out-of-scope variables
    const testSubjMap: Record<string, string> = {
      service_account: 'gcpCredentialsServiceAccountInput',
      'gcp.credentials.service_account_email': 'gcpCredentialsServiceAccountInput',
      audience: 'gcpCredentialsAudienceInput',
      'gcp.credentials.audience': 'gcpCredentialsAudienceInput',
    };
    const testSubj = testSubjMap[fieldName] || `mock-var-field-${fieldName}`;

    return (
      <input
        data-test-subj={testSubj}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={varDef.title}
      />
    );
  }),
}));

describe('GCPCloudConnectorForm', () => {
  const mockUpdatePolicy = jest.fn();
  const mockSetCredentials = jest.fn();

  const createMockInput = (overrides = {}): NewPackagePolicyInput => ({
    type: 'cloudbeat/cis_gcp',
    policy_template: 'cis_gcp',
    enabled: true,
    streams: [
      {
        enabled: true,
        data_stream: {
          type: 'logs',
          dataset: 'gcp.cloudtrail',
        },
        vars: {
          service_account: { value: '', type: 'text' },
          audience: { value: '', type: 'text' },
          gcp_credentials_cloud_connector_id: { value: '', type: 'text' },
        },
      },
    ],
    ...overrides,
  });

  const createMockPolicy = (overrides = {}): NewPackagePolicy => ({
    id: 'test-policy-id',
    name: 'test-policy',
    namespace: 'default',
    enabled: true,
    policy_id: 'test-policy',
    policy_ids: ['test-policy'],
    package: {
      name: 'cloud_security_posture',
      title: 'Cloud Security Posture',
      version: '1.0.0',
    },
    inputs: [createMockInput()],
    ...overrides,
  });

  const createMockPackageInfo = (overrides = {}): PackageInfo =>
    ({
      name: 'cloud_security_posture',
      title: 'Cloud Security Posture',
      version: '1.0.0',
      description: 'Test package',
      type: 'integration',
      categories: [],
      conditions: {},
      screenshots: [],
      icons: [],
      assets: {},
      policy_templates: [],
      data_streams: [
        {
          type: 'logs',
          dataset: 'gcp.cloudtrail',
          title: 'GCP Cloud Trail',
          release: 'ga',
          package: 'cloud_security_posture',
          path: 'gcp',
          ingest_pipeline: 'default',
          streams: [
            {
              input: 'cloudbeat/cis_gcp',
              title: 'GCP CIS',
              description: 'GCP CIS compliance monitoring',
              enabled: true,
              vars: [
                {
                  name: 'service_account',
                  type: 'text',
                  title: 'Service Account',
                  multi: false,
                  required: true,
                  show_user: true,
                  secret: true,
                },
                {
                  name: 'audience',
                  type: 'text',
                  title: 'Audience',
                  multi: false,
                  required: true,
                  show_user: true,
                  secret: true,
                },
              ],
            },
          ],
        },
      ],
      owner: { github: 'elastic/security' },
      ...overrides,
    } as unknown as PackageInfo);

  const createMockCloudSetup = (overrides = {}) => {
    const mock = cloudMock.createSetup();
    return {
      ...mock,
      isCloudEnabled: true,
      cloudId: 'test-cloud-id:dGVzdC1jbG91ZC1pZA==',
      cloudHost: 'cloud.elastic.co',
      deploymentUrl: 'https://cloud.elastic.co/deployments/test-deployment-id',
      isServerlessEnabled: false,
      ...overrides,
    };
  };

  const defaultProps: CloudConnectorFormProps = {
    input: createMockInput(),
    newPolicy: createMockPolicy(),
    packageInfo: createMockPackageInfo(),
    updatePolicy: mockUpdatePolicy,
    cloud: createMockCloudSetup(),
    hasInvalidRequiredVars: false,
    credentials: undefined,
    setCredentials: mockSetCredentials,
  };

  const renderComponent = (props: Partial<CloudConnectorFormProps> = {}) => {
    return render(
      <I18nProvider>
        <GCPCloudConnectorForm {...defaultProps} {...props} />
      </I18nProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the accordion with Cloud Shell guide', () => {
      renderComponent();

      expect(screen.getByText(/Steps to create Service Account in GCP/i)).toBeInTheDocument();
      // Cloud Shell guide is tested in its own test file
      expect(screen.getByText(/Log in to the Google Cloud console/i)).toBeInTheDocument();
    });

    it('should render documentation link', () => {
      renderComponent();

      expect(screen.getByText(/Read the/i)).toBeInTheDocument();
      expect(screen.getByText(/documentation/i)).toBeInTheDocument();
    });

    it('should not render Launch Cloud Shell button without valid Cloud Shell URL', () => {
      // In test environment, the utility function doesn't generate a valid URL
      renderComponent();

      // Button only appears when cloudShellUrl is truthy
      expect(
        screen.queryByTestId(GCP_LAUNCH_CLOUD_CONNECTOR_CLOUD_SHELL_TEST_SUBJ)
      ).not.toBeInTheDocument();
      // But the form fields should still render
      expect(
        screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.SERVICE_ACCOUNT)
      ).toBeInTheDocument();
      expect(screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.AUDIENCE)).toBeInTheDocument();
    });

    it('should not render Launch Cloud Shell button when cloud is undefined', () => {
      renderComponent({ cloud: undefined });

      expect(
        screen.queryByTestId(GCP_LAUNCH_CLOUD_CONNECTOR_CLOUD_SHELL_TEST_SUBJ)
      ).not.toBeInTheDocument();
    });

    it('should not render Launch Cloud Shell button when templateName is undefined', () => {
      renderComponent({ templateName: undefined });

      expect(
        screen.queryByTestId(GCP_LAUNCH_CLOUD_CONNECTOR_CLOUD_SHELL_TEST_SUBJ)
      ).not.toBeInTheDocument();
    });

    it('should render CloudConnectorInputFields when fields are available', () => {
      renderComponent();

      // Verify individual form fields render
      expect(
        screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.SERVICE_ACCOUNT)
      ).toBeInTheDocument();
      expect(screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.AUDIENCE)).toBeInTheDocument();
      expect(
        screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.CLOUD_CONNECTOR_ID)
      ).toBeInTheDocument();
    });

    it('should render accordion with initialIsOpen set to true', () => {
      const { container } = renderComponent();

      // Check if accordion is open by verifying the button's aria-expanded attribute
      const accordionButton = container.querySelector(
        `[data-test-subj="${GCP_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ}"] button[aria-expanded="true"]`
      );
      expect(accordionButton).toBeInTheDocument();
    });
  });

  describe('elastic stack ID computation', () => {
    it('should display serverless projectId when serverless is enabled', () => {
      const cloud = createMockCloudSetup({
        isServerlessEnabled: true,
        serverless: { projectId: 'serverless-project-123' },
      });

      renderComponent({ cloud });

      // The elastic stack ID should be rendered in the Cloud Shell guide
      expect(screen.getByText('serverless-project-123')).toBeInTheDocument();
    });

    it('should extract kibana component ID from cloudId when cloud is enabled', () => {
      const cloud = createMockCloudSetup({
        isCloudEnabled: true,
        cloudId: 'test:dGVzdC1ob3N0JGtpYmFuYS1jb21wb25lbnQtaWQkZXMtY29tcG9uZW50LWlk',
        deploymentUrl: 'https://cloud.elastic.co/deployments/deployment-123',
      });

      renderComponent({ cloud });

      // The component should extract and display the kibana component ID from the cloudId
      expect(screen.getByText('es-component-id')).toBeInTheDocument();
    });
  });

  describe('credentials handling', () => {
    it('should update credentials when setCredentials is available and onChange is called', () => {
      const credentials = {
        serviceAccount: 'initial-service-account@project.iam.gserviceaccount.com',
        audience: 'initial-audience',
        gcp_credentials_cloud_connector_id: 'initial-connector',
      };

      renderComponent({ credentials, setCredentials: mockSetCredentials });

      const serviceAccountInput = screen.getByTestId(
        GCP_INPUT_FIELDS_TEST_SUBJECTS.SERVICE_ACCOUNT
      );
      fireEvent.change(serviceAccountInput, {
        target: { value: 'new-service-account@project.iam.gserviceaccount.com' },
      });

      expect(mockSetCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccount: 'new-service-account@project.iam.gserviceaccount.com',
        })
      );
    });

    it('should update audience in credentials when audience field changes', () => {
      const credentials = {
        serviceAccount: 'test-service-account@project.iam.gserviceaccount.com',
        audience: 'initial-audience',
        gcp_credentials_cloud_connector_id: 'test-connector',
      };

      renderComponent({ credentials, setCredentials: mockSetCredentials });

      const audienceInput = screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.AUDIENCE);
      fireEvent.change(audienceInput, { target: { value: 'new-audience' } });

      expect(mockSetCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          audience: 'new-audience',
        })
      );
    });

    it('should update gcp_credentials_cloud_connector_id in credentials', () => {
      const credentials = {
        serviceAccount: 'test-service-account@project.iam.gserviceaccount.com',
        audience: 'test-audience',
        gcp_credentials_cloud_connector_id: 'initial-connector',
      };

      renderComponent({ credentials, setCredentials: mockSetCredentials });

      const connectorIdInput = screen.getByTestId(
        GCP_INPUT_FIELDS_TEST_SUBJECTS.CLOUD_CONNECTOR_ID
      );
      fireEvent.change(connectorIdInput, { target: { value: 'new-connector-id' } });

      expect(mockSetCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          gcp_credentials_cloud_connector_id: 'new-connector-id',
        })
      );
    });

    it('should fallback to updatePolicy when credentials is undefined', () => {
      renderComponent({ credentials: undefined });

      const serviceAccountInput = screen.getByTestId(
        GCP_INPUT_FIELDS_TEST_SUBJECTS.SERVICE_ACCOUNT
      );
      fireEvent.change(serviceAccountInput, {
        target: { value: 'fallback-service-account@project.iam.gserviceaccount.com' },
      });

      expect(mockUpdatePolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedPolicy: expect.any(Object),
        })
      );
    });

    it('should fallback to updatePolicy when setCredentials is undefined', () => {
      const credentials = {
        serviceAccount: 'test-service-account@project.iam.gserviceaccount.com',
        audience: 'test-audience',
      };

      renderComponent({ credentials, setCredentials: undefined as any });

      const serviceAccountInput = screen.getByTestId(
        GCP_INPUT_FIELDS_TEST_SUBJECTS.SERVICE_ACCOUNT
      );
      fireEvent.change(serviceAccountInput, {
        target: { value: 'fallback-service-account@project.iam.gserviceaccount.com' },
      });

      expect(mockUpdatePolicy).toHaveBeenCalled();
    });
  });
});
