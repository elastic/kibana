/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { PackagePolicyConfigRecord } from '../../../../common';
import { AZURE_INPUT_FIELDS_TEST_SUBJECTS } from '../../../../common/services/cloud_connectors/test_subjects';

import { AZURE_CLOUD_CONNECTOR_FIELD_NAMES, AZURE_PROVIDER } from '../constants';

import { getAzureCloudConnectorsCredentialsFormOptions } from './azure_cloud_connector_options';

describe('getAzureCloudConnectorsCredentialsFormOptions', () => {
  const createMockInputVars = (overrides: Partial<PackagePolicyConfigRecord> = {}) => ({
    [AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID]: {
      value: 'test-tenant-id',
      type: 'text',
    },
    [AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID]: {
      value: 'test-client-id',
      type: 'text',
    },
    [AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID]: {
      value: 'test-connector-id',
      type: 'text',
    },
    ...overrides,
  });

  describe('basic functionality', () => {
    it('should return undefined when inputVars is undefined', () => {
      const result = getAzureCloudConnectorsCredentialsFormOptions(undefined);
      expect(result).toBeUndefined();
    });

    it('should return result with empty fields array when inputVars is empty', () => {
      const result = getAzureCloudConnectorsCredentialsFormOptions({});
      expect(result?.fields).toEqual([]);
      expect(result?.provider).toBe(AZURE_PROVIDER);
    });

    it('should return provider as AZURE_PROVIDER', () => {
      const inputVars = createMockInputVars();
      const result = getAzureCloudConnectorsCredentialsFormOptions(inputVars);

      expect(result?.provider).toBe(AZURE_PROVIDER);
    });

    it('should render description with correct text', () => {
      const inputVars = createMockInputVars();
      const result = getAzureCloudConnectorsCredentialsFormOptions(inputVars);

      const { getByText } = render(<I18nProvider>{result?.description}</I18nProvider>);

      expect(getByText(/Configure Azure Cloud Connector credentials/i)).toBeInTheDocument();
    });
  });

  describe('field configuration', () => {
    it('should create fields for tenant_id when present', () => {
      const inputVars = createMockInputVars();
      const result = getAzureCloudConnectorsCredentialsFormOptions(inputVars);

      const tenantField = result?.fields.find(
        (field) => field.id === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID
      );

      expect(tenantField).toBeDefined();
      expect(tenantField?.label).toBe('Tenant ID');
      expect(tenantField?.type).toBe('text');
      expect(tenantField?.dataTestSubj).toBe(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID);
      expect(tenantField?.isSecret).toBe(true);
      expect(tenantField?.value).toBe('test-tenant-id');
    });

    it('should create fields for client_id when present', () => {
      const inputVars = createMockInputVars();
      const result = getAzureCloudConnectorsCredentialsFormOptions(inputVars);

      const clientField = result?.fields.find(
        (field) => field.id === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID
      );

      expect(clientField).toBeDefined();
      expect(clientField?.label).toBe('Client ID');
      expect(clientField?.type).toBe('text');
      expect(clientField?.dataTestSubj).toBe(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID);
      expect(clientField?.isSecret).toBe(true);
      expect(clientField?.value).toBe('test-client-id');
    });

    it('should create fields for azure_credentials_cloud_connector_id when present', () => {
      const inputVars = createMockInputVars();
      const result = getAzureCloudConnectorsCredentialsFormOptions(inputVars);

      const connectorField = result?.fields.find(
        (field) =>
          field.id === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID
      );

      expect(connectorField).toBeDefined();
      expect(connectorField?.label).toBe('Cloud Connector ID');
      expect(connectorField?.type).toBe('text');
      expect(connectorField?.dataTestSubj).toBe(
        AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLOUD_CONNECTOR_ID
      );
      expect(connectorField?.isSecret).toBeUndefined();
      expect(connectorField?.value).toBe('test-connector-id');
    });

    it('should create fields for azure.credentials.tenant_id when present', () => {
      const inputVars = createMockInputVars({
        [AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID]: {
          value: 'azure-tenant-id',
          type: 'text',
        },
      });
      const result = getAzureCloudConnectorsCredentialsFormOptions(inputVars);

      const azureTenantField = result?.fields.find(
        (field) => field.id === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID
      );

      expect(azureTenantField).toBeDefined();
      expect(azureTenantField?.label).toBe('Tenant ID');
      expect(azureTenantField?.type).toBe('text');
      expect(azureTenantField?.dataTestSubj).toBe(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID);
      expect(azureTenantField?.isSecret).toBe(true);
      expect(azureTenantField?.value).toBe('azure-tenant-id');
    });

    it('should create fields for azure.credentials.client_id when present', () => {
      const inputVars = createMockInputVars({
        [AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID]: {
          value: 'azure-client-id',
          type: 'text',
        },
      });
      const result = getAzureCloudConnectorsCredentialsFormOptions(inputVars);

      const azureClientField = result?.fields.find(
        (field) => field.id === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID
      );

      expect(azureClientField).toBeDefined();
      expect(azureClientField?.label).toBe('Client ID');
      expect(azureClientField?.type).toBe('text');
      expect(azureClientField?.dataTestSubj).toBe(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID);
      expect(azureClientField?.isSecret).toBe(true);
      expect(azureClientField?.value).toBe('azure-client-id');
    });
  });

  describe('field ordering', () => {
    it('should maintain correct field sequence order', () => {
      const inputVars = createMockInputVars({
        [AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID]: {
          value: 'azure-tenant',
          type: 'text',
        },
        [AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID]: {
          value: 'azure-client',
          type: 'text',
        },
      });
      const result = getAzureCloudConnectorsCredentialsFormOptions(inputVars);

      // Expected order: tenant_id, azure.credentials.tenant_id, client_id, azure.credentials.client_id, azure_credentials_cloud_connector_id
      expect(result?.fields[0].id).toBe(AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID);
      expect(result?.fields[1].id).toBe(AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID);
      expect(result?.fields[2].id).toBe(AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID);
      expect(result?.fields[3].id).toBe(AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID);
      expect(result?.fields[4].id).toBe(
        AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID
      );
    });

    it('should skip missing fields in sequence', () => {
      const inputVars: PackagePolicyConfigRecord = {
        [AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID]: {
          value: 'test-connector-id',
          type: 'text',
        },
      };

      const result = getAzureCloudConnectorsCredentialsFormOptions(inputVars);

      expect(result?.fields.length).toBe(1);
      expect(result?.fields[0].id).toBe(
        AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID
      );
    });

    it('should return result with empty fields array when no valid fields present', () => {
      const inputVars = {
        some_other_field: {
          value: 'test',
          type: 'text',
        },
      };
      const result = getAzureCloudConnectorsCredentialsFormOptions(inputVars);

      expect(result?.fields).toEqual([]);
      expect(result?.provider).toBe(AZURE_PROVIDER);
    });
  });

  describe('field values', () => {
    it('should preserve field values from inputVars', () => {
      const inputVars = createMockInputVars({
        [AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID]: {
          value: 'custom-tenant-123',
          type: 'text',
        },
        [AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID]: {
          value: 'custom-client-456',
          type: 'text',
        },
        [AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID]: {
          value: 'custom-connector-789',
          type: 'text',
        },
      });
      const result = getAzureCloudConnectorsCredentialsFormOptions(inputVars);

      expect(result?.fields[0].value).toBe('custom-tenant-123');
      expect(result?.fields[1].value).toBe('custom-client-456');
      expect(result?.fields[2].value).toBe('custom-connector-789');
    });

    it('should handle empty string values', () => {
      const inputVars = createMockInputVars({
        [AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID]: {
          value: '',
          type: 'text',
        },
      });
      const result = getAzureCloudConnectorsCredentialsFormOptions(inputVars);

      const tenantField = result?.fields.find(
        (field) => field.id === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID
      );
      expect(tenantField?.value).toBe('');
    });
  });

  describe('field properties', () => {
    it('should set isSecret to true for tenant_id fields', () => {
      const inputVars = createMockInputVars();
      const result = getAzureCloudConnectorsCredentialsFormOptions(inputVars);

      const tenantField = result?.fields.find(
        (field) => field.id === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID
      );
      expect(tenantField?.isSecret).toBe(true);
    });

    it('should set isSecret to true for client_id fields', () => {
      const inputVars = createMockInputVars();
      const result = getAzureCloudConnectorsCredentialsFormOptions(inputVars);

      const clientField = result?.fields.find(
        (field) => field.id === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID
      );
      expect(clientField?.isSecret).toBe(true);
    });

    it('should not set isSecret for cloud_connector_id field', () => {
      const inputVars = createMockInputVars();
      const result = getAzureCloudConnectorsCredentialsFormOptions(inputVars);

      const connectorField = result?.fields.find(
        (field) =>
          field.id === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID
      );
      expect(connectorField?.isSecret).toBeUndefined();
    });

    it('should set all fields type to text', () => {
      const inputVars = createMockInputVars({
        [AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID]: {
          value: 'test',
          type: 'text',
        },
        [AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID]: {
          value: 'test',
          type: 'text',
        },
      });
      const result = getAzureCloudConnectorsCredentialsFormOptions(inputVars);

      result?.fields.forEach((field) => {
        expect(field.type).toBe('text');
      });
    });
  });
});
