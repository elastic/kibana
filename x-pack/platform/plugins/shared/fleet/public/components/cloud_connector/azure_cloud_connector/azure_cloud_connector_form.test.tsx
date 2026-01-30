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
  AZURE_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ,
  AZURE_INPUT_FIELDS_TEST_SUBJECTS,
  AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ,
} from '../../../../common/services/cloud_connectors/test_subjects';

import type { CloudConnectorFormProps } from '../types';

import { AzureCloudConnectorForm } from './azure_cloud_connector_form';

// Mock the LazyPackagePolicyInputVarField
jest.mock('../../..', () => ({
  LazyPackagePolicyInputVarField: jest.fn(({ varDef, onChange, value }) => {
    // Extract the field name from the varDef - use the last part of multi_fields path or name
    const fieldName = varDef.multi_fields?.[0] || varDef.name || 'unknown';
    // Use hardcoded test subject values to avoid accessing out-of-scope variables
    const testSubjMap: Record<string, string> = {
      tenant_id: 'textInput-tenant-id',
      'azure.tenant_id': 'textInput-tenant-id',
      client_id: 'textInput-client-id',
      'azure.client_id': 'textInput-client-id',
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

describe('AzureCloudConnectorForm', () => {
  const mockUpdatePolicy = jest.fn();
  const mockSetCredentials = jest.fn();

  const createMockInput = (overrides = {}): NewPackagePolicyInput => ({
    type: 'cloudbeat/cis_azure',
    policy_template: 'cis_azure',
    enabled: true,
    streams: [
      {
        enabled: true,
        data_stream: {
          type: 'logs',
          dataset: 'azure.cloudtrail',
        },
        vars: {
          tenant_id: { value: '', type: 'text' },
          client_id: { value: '', type: 'text' },
          azure_credentials_cloud_connector_id: { value: '', type: 'text' },
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
          dataset: 'azure.cloudtrail',
          title: 'Azure Cloud Trail',
          release: 'ga',
          package: 'cloud_security_posture',
          path: 'azure',
          ingest_pipeline: 'default',
          streams: [
            {
              input: 'cloudbeat/cis_azure',
              title: 'Azure CIS',
              description: 'Azure CIS compliance monitoring',
              enabled: true,
              vars: [
                {
                  name: 'tenant_id',
                  type: 'text',
                  title: 'Tenant ID',
                  multi: false,
                  required: true,
                  show_user: true,
                  secret: true,
                },
                {
                  name: 'client_id',
                  type: 'text',
                  title: 'Client ID',
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
        <AzureCloudConnectorForm {...defaultProps} {...props} />
      </I18nProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the accordion with ARM template guide', () => {
      renderComponent();

      expect(
        screen.getByText(/Steps to create Managed User Identity in Azure/i)
      ).toBeInTheDocument();
      // ARM template guide is tested in its own test file
      expect(screen.getByText(/Log in to the Azure console/i)).toBeInTheDocument();
    });

    it('should not render Deploy to Azure button without valid ARM template URL', () => {
      // In test environment, the utility function doesn't generate a valid URL
      renderComponent();

      // Button only appears when armTemplateUrl is truthy
      expect(
        screen.queryByTestId(AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ)
      ).not.toBeInTheDocument();
      // But the form fields should still render
      expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID)).toBeInTheDocument();
      expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID)).toBeInTheDocument();
    });

    it('should not render Deploy to Azure button when cloud is undefined', () => {
      renderComponent({ cloud: undefined });

      expect(
        screen.queryByTestId(AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ)
      ).not.toBeInTheDocument();
    });

    it('should not render Deploy to Azure button when templateName is undefined', () => {
      renderComponent({ templateName: undefined });

      expect(
        screen.queryByTestId(AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ)
      ).not.toBeInTheDocument();
    });

    it('should render CloudConnectorInputFields when fields are available', () => {
      renderComponent();

      // Verify individual form fields render
      expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID)).toBeInTheDocument();
      expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID)).toBeInTheDocument();
      expect(
        screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLOUD_CONNECTOR_ID)
      ).toBeInTheDocument();
    });

    it('should render accordion with initialIsOpen set to true', () => {
      const { container } = renderComponent();

      // Check if accordion is open by verifying the button's aria-expanded attribute
      const accordionButton = container.querySelector(
        `[data-test-subj="${AZURE_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ}"] button[aria-expanded="true"]`
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

      // The elastic stack ID should be rendered in the ARM template guide
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
        tenantId: 'initial-tenant',
        clientId: 'initial-client',
        azure_credentials_cloud_connector_id: 'initial-connector',
      };

      renderComponent({ credentials, setCredentials: mockSetCredentials });

      const tenantIdInput = screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID);
      fireEvent.change(tenantIdInput, { target: { value: 'new-tenant-id' } });

      expect(mockSetCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'new-tenant-id',
        })
      );
    });

    it('should update clientId in credentials when client_id field changes', () => {
      const credentials = {
        tenantId: 'test-tenant',
        clientId: 'initial-client',
        azure_credentials_cloud_connector_id: 'test-connector',
      };

      renderComponent({ credentials, setCredentials: mockSetCredentials });

      const clientIdInput = screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID);
      fireEvent.change(clientIdInput, { target: { value: 'new-client-id' } });

      expect(mockSetCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'new-client-id',
        })
      );
    });

    it('should update azure_credentials_cloud_connector_id in credentials', () => {
      const credentials = {
        tenantId: 'test-tenant',
        clientId: 'test-client',
        azure_credentials_cloud_connector_id: 'initial-connector',
      };

      renderComponent({ credentials, setCredentials: mockSetCredentials });

      const connectorIdInput = screen.getByTestId(
        AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLOUD_CONNECTOR_ID
      );
      fireEvent.change(connectorIdInput, { target: { value: 'new-connector-id' } });

      expect(mockSetCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          azure_credentials_cloud_connector_id: 'new-connector-id',
        })
      );
    });

    it('should fallback to updatePolicy when credentials is undefined', () => {
      renderComponent({ credentials: undefined });

      const tenantIdInput = screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID);
      fireEvent.change(tenantIdInput, { target: { value: 'fallback-tenant' } });

      expect(mockUpdatePolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedPolicy: expect.any(Object),
        })
      );
    });

    it('should fallback to updatePolicy when setCredentials is undefined', () => {
      const credentials = {
        tenantId: 'test-tenant',
        clientId: 'test-client',
      };

      renderComponent({ credentials, setCredentials: undefined as any });

      const tenantIdInput = screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID);
      fireEvent.change(tenantIdInput, { target: { value: 'fallback-tenant' } });

      expect(mockUpdatePolicy).toHaveBeenCalled();
    });
  });
});
