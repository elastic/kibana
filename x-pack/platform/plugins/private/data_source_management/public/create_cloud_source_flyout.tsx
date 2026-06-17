/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiIcon,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiSuperSelect,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataSourceWithSecrets } from '../common';
import { useDataSourceManagementAppContext } from './data_source_management_app_context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CloudProvider = 'aws' | 'gcp' | 'azure';
type FederatedMode = 'new' | 'existing';

interface FormState {
  provider: CloudProvider;
  name: string;
  description: string;
  credentialType: string;
  federatedMode: FederatedMode;
  federatedName: string;
  // AWS
  roleArn: string;
  externalId: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  // GCP
  gcpProjectId: string;
  gcpCredentialsJson: string;
  gcpServiceAccount: string;
  gcpAudience: string;
  gcpFederatedId: string;
  // Azure
  azureTenantId: string;
  azureClientId: string;
  azureClientSecret: string;
  azureFederatedTenantId: string;
  azureFederatedClientId: string;
  azureFederatedId: string;
}

const initialState = (): FormState => ({
  provider: 'aws',
  name: '',
  description: '',
  credentialType: 'federated_identity',
  federatedMode: 'new',
  federatedName: '',
  roleArn: '',
  externalId: '',
  accessKeyId: '',
  secretAccessKey: '',
  sessionToken: '',
  gcpProjectId: '',
  gcpCredentialsJson: '',
  gcpServiceAccount: '',
  gcpAudience: '',
  gcpFederatedId: '',
  azureTenantId: '',
  azureClientId: '',
  azureClientSecret: '',
  azureFederatedTenantId: '',
  azureFederatedClientId: '',
  azureFederatedId: '',
});

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const PROVIDERS: Array<{ id: CloudProvider; shortName: string; icon: string }> = [
  { id: 'aws', shortName: 'Amazon Web Services', icon: 'logoAWS' },
  { id: 'gcp', shortName: 'Google Cloud Platform', icon: 'logoGCP' },
  { id: 'azure', shortName: 'Azure', icon: 'logoAzure' },
];

const CREDENTIAL_OPTIONS: Record<CloudProvider, Array<{ value: string; text: string }>> = {
  aws: [
    {
      value: 'federated_identity',
      text: i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.credentials.aws.federatedIdentity',
        { defaultMessage: 'Federated Identity (recommended)' }
      ),
    },
    {
      value: 'direct_access_keys',
      text: i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.credentials.aws.directAccessKeys',
        { defaultMessage: 'Direct access keys' }
      ),
    },
  ],
  gcp: [
    {
      value: 'federated_identity',
      text: i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.credentials.gcp.federatedIdentity',
        { defaultMessage: 'Federated Identity (recommended)' }
      ),
    },
    {
      value: 'credentials_json',
      text: i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.credentials.gcp.credentialsJson',
        { defaultMessage: 'Service account JSON' }
      ),
    },
  ],
  azure: [
    {
      value: 'federated_identity',
      text: i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.credentials.azure.federatedIdentity',
        { defaultMessage: 'Federated Identity (recommended)' }
      ),
    },
    {
      value: 'service_principal_secret',
      text: i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.credentials.azure.servicePrincipalSecret',
        { defaultMessage: 'Service Principal with Client Secret' }
      ),
    },
  ],
};

const AWS_CREDENTIAL_METHOD_DESCRIPTIONS: Partial<Record<string, string>> = {
  direct_access_keys: i18n.translate(
    'dataSourceManagement.cloudSourceFlyout.credentials.aws.directAccessKeys.description',
    {
      defaultMessage:
        'Access keys are long-term credentials for an IAM user or the AWS account root user.',
    }
  ),
};

const GCP_CREDENTIAL_METHOD_DESCRIPTIONS: Partial<Record<string, string>> = {
  credentials_json: i18n.translate(
    'dataSourceManagement.cloudSourceFlyout.credentials.gcp.credentialsJson.description',
    {
      defaultMessage:
        'Provide a Google Cloud service account key in JSON format. The service account must have the required IAM roles to access the resources you want to connect.',
    }
  ),
};

const AZURE_CREDENTIAL_METHOD_DESCRIPTIONS: Partial<Record<string, string>> = {
  service_principal_secret: i18n.translate(
    'dataSourceManagement.cloudSourceFlyout.credentials.azure.servicePrincipalSecret.description',
    {
      defaultMessage:
        'Authenticate using an Azure Active Directory application (service principal) with a client secret. The service principal must be assigned the appropriate roles on the resources you want to connect.',
    }
  ),
};

const DEFAULT_CREDENTIAL_TYPE: Record<CloudProvider, string> = {
  aws: 'federated_identity',
  gcp: 'federated_identity',
  azure: 'federated_identity',
};

const renderProviderDisplay = (shortName: string, icon: string) => (
  <EuiFlexGroup
    gutterSize="s"
    alignItems="center"
    responsive={false}
    justifyContent="flexStart"
    css={{ width: '100%' }}
  >
    <EuiFlexItem grow={false}>
      <EuiIcon type={icon} size="l" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>{shortName}</EuiFlexItem>
  </EuiFlexGroup>
);

const PROVIDER_SUPER_SELECT_OPTIONS = PROVIDERS.map(({ id, shortName, icon }) => ({
  value: id,
  inputDisplay: renderProviderDisplay(shortName, icon),
  dropdownDisplay: renderProviderDisplay(shortName, icon),
  'data-test-subj': `cloudSourceFlyoutProvider-${id}`,
}));

const CloudProviderSelect: FunctionComponent<{
  value: CloudProvider;
  onChange: (provider: CloudProvider) => void;
}> = ({ value, onChange }) => (
  <EuiSuperSelect
    fullWidth
    options={PROVIDER_SUPER_SELECT_OPTIONS}
    valueOfSelected={value}
    onChange={(provider) => onChange(provider as CloudProvider)}
    data-test-subj="cloudSourceFlyoutProviderSelect"
    css={{
      textAlign: 'left',
    }}
  />
);

// Elastic docs links (placeholder paths for prototype)
const DOCS_URLS: Record<CloudProvider, string> = {
  aws: 'https://www.elastic.co/docs/current/serverless/security/cloud-native-security-overview',
  gcp: 'https://www.elastic.co/docs/current/serverless/security/cloud-native-security-overview',
  azure: 'https://www.elastic.co/docs/current/serverless/security/cloud-native-security-overview',
};

// ---------------------------------------------------------------------------
// Helper: build DataSourceWithSecrets from form state
// ---------------------------------------------------------------------------

const buildDataSource = (state: FormState): Omit<DataSourceWithSecrets, 'id'> => {
  const {
    provider,
    description,
    credentialType,
    accessKeyId,
    secretAccessKey,
    gcpProjectId,
    gcpCredentialsJson,
    azureClientId,
    azureClientSecret,
  } = state;

  if (provider === 'aws') {
    return {
      type: 's3',
      description,
      settings: {
        auth: credentialType,
        access_key: accessKeyId || undefined,
        secret_key: secretAccessKey || undefined,
      },
    };
  }

  if (provider === 'gcp') {
    let credentials: {} | undefined;
    if (credentialType === 'credentials_json' && gcpCredentialsJson.trim()) {
      try {
        credentials = JSON.parse(gcpCredentialsJson);
      } catch {
        credentials = undefined;
      }
    }
    return {
      type: 'gcs',
      description,
      settings: {
        auth: credentialType,
        project_id: gcpProjectId || undefined,
        credentials,
      },
    };
  }

  // azure
  return {
    type: 'azure_blob',
    description,
    settings: {
      auth: credentialType,
      // client_id → account, client_secret → key (prototype mapping)
      account: azureClientId || undefined,
      key: azureClientSecret || undefined,
    },
  };
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SectionTitle: FunctionComponent<{ children: React.ReactNode }> = ({ children }) => (
  <EuiTitle size="xs">
    <h3>{children}</h3>
  </EuiTitle>
);

const ReadDocumentationLink: FunctionComponent<{ url: string }> = ({ url }) => (
  <EuiText color="subdued" size="s">
    <FormattedMessage
      id="dataSourceManagement.cloudSourceFlyout.readDocumentation"
      defaultMessage="Read the {documentation} for more details"
      values={{
        documentation: (
          <EuiLink href={url} target="_blank" rel="noopener noreferrer">
            <FormattedMessage
              id="dataSourceManagement.cloudSourceFlyout.documentationLinkText"
              defaultMessage="documentation"
            />
          </EuiLink>
        ),
      }}
    />
  </EuiText>
);

// ---------------------------------------------------------------------------
// Shared federated identity name field
// ---------------------------------------------------------------------------

const FederatedIdentityNameField: FunctionComponent<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => (
  <EuiFormRow
    label={i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.name', {
      defaultMessage: 'Federated Identity Name',
    })}
    fullWidth
  >
    <EuiFieldText
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-test-subj="cloudSourceFlyoutFederatedName"
      fullWidth
      autoComplete="off"
    />
  </EuiFormRow>
);

// ---------------------------------------------------------------------------
// Existing Identity placeholder (no backend API yet)
// ---------------------------------------------------------------------------

const ExistingIdentityPlaceholder: FunctionComponent = () => (
  <EuiFormRow
    label={i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.name', {
      defaultMessage: 'Federated Identity Name',
    })}
    fullWidth
  >
    <EuiSuperSelect
      options={[]}
      valueOfSelected=""
      onChange={() => {}}
      placeholder={i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.existingIdentity.selectPlaceholder',
        { defaultMessage: 'Select a Federated Identity' }
      )}
      disabled
      fullWidth
      data-test-subj="cloudSourceFlyoutExistingIdentitySelect"
    />
  </EuiFormRow>
);

// ---------------------------------------------------------------------------
// AWS New Identity fields
// ---------------------------------------------------------------------------

const AwsNewIdentityFields: FunctionComponent<{
  state: FormState;
  onChange: (field: keyof FormState, value: string) => void;
}> = ({ state, onChange }) => (
  <>
    <FederatedIdentityNameField
      value={state.federatedName}
      onChange={(v) => onChange('federatedName', v)}
    />
    <EuiSpacer size="m" />
    <EuiAccordion
      id="cloudSourceFlyoutAwsSteps"
      buttonContent={i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.federated.aws.stepsTitle',
        { defaultMessage: 'Steps to assume role' }
      )}
      data-test-subj="cloudSourceFlyoutAwsSteps"
    >
      <EuiSpacer size="s" />
      <EuiText size="s">
        <ol>
          <li>
            {i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.aws.step1', {
              defaultMessage: 'Open the AWS Management Console and navigate to IAM.',
            })}
          </li>
          <li>
            {i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.aws.step2', {
              defaultMessage: 'Create or select an IAM role with permissions to access your data.',
            })}
          </li>
          <li>
            {i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.aws.step3', {
              defaultMessage:
                'Edit the trust policy to allow Elastic\u2019s AWS account to assume this role.',
            })}
          </li>
          <li>
            {i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.aws.step4', {
              defaultMessage: 'Copy the Role ARN and paste it in the field below.',
            })}
          </li>
          <li>
            {i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.aws.step5', {
              defaultMessage:
                'Optionally provide an External ID to further restrict role assumption.',
            })}
          </li>
        </ol>
      </EuiText>
    </EuiAccordion>
    <EuiSpacer size="m" />
    <ReadDocumentationLink url={DOCS_URLS.aws} />
    <EuiSpacer size="m" />
    <EuiFormRow
      label={i18n.translate('dataSourceManagement.cloudSourceFlyout.aws.roleArn', {
        defaultMessage: 'Role ARN',
      })}
      helpText={i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.aws.roleArnHelp', {
        defaultMessage: 'The Amazon Resource Name of the IAM role Elastic will assume.',
      })}
      fullWidth
    >
      <EuiFieldText
        value={state.roleArn}
        onChange={(e) => onChange('roleArn', e.target.value)}
        data-test-subj="cloudSourceFlyoutFederatedAwsRoleArn"
        fullWidth
        autoComplete="off"
        placeholder="arn:aws:iam::123456789012:role/MyRole"
      />
    </EuiFormRow>
    <EuiFormRow
      label={i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.aws.externalId', {
        defaultMessage: 'External ID',
      })}
      helpText={i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.federated.aws.externalIdHelp',
        { defaultMessage: 'A unique identifier used when assuming the role for extra security.' }
      )}
      fullWidth
    >
      <EuiFieldPassword
        type="dual"
        value={state.externalId}
        onChange={(e) => onChange('externalId', e.target.value)}
        data-test-subj="cloudSourceFlyoutFederatedAwsExternalId"
        fullWidth
        autoComplete="off"
      />
    </EuiFormRow>
  </>
);

// ---------------------------------------------------------------------------
// GCP New Identity fields
// ---------------------------------------------------------------------------

const GcpNewIdentityFields: FunctionComponent<{
  state: FormState;
  onChange: (field: keyof FormState, value: string) => void;
}> = ({ state, onChange }) => (
  <>
    <FederatedIdentityNameField
      value={state.federatedName}
      onChange={(v) => onChange('federatedName', v)}
    />
    <EuiSpacer size="m" />
    <EuiAccordion
      id="cloudSourceFlyoutGcpSteps"
      buttonContent={i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.federated.gcp.stepsTitle',
        { defaultMessage: 'Steps to generate GCP Service Account' }
      )}
      data-test-subj="cloudSourceFlyoutGcpSteps"
    >
      <EuiSpacer size="s" />
      <EuiText size="s">
        <ol>
          <li>
            {i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.gcp.step1', {
              defaultMessage: 'Open the Google Cloud Console and select your project.',
            })}
          </li>
          <li>
            {i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.gcp.step2', {
              defaultMessage:
                'Navigate to IAM & Admin > Service Accounts and create a new service account.',
            })}
          </li>
          <li>
            {i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.gcp.step3', {
              defaultMessage:
                'Grant the service account the required roles (e.g. Storage Object Viewer).',
            })}
          </li>
          <li>
            {i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.gcp.step4', {
              defaultMessage:
                'Configure Workload Identity Federation to allow Elastic to impersonate the service account.',
            })}
          </li>
          <li>
            {i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.gcp.step5', {
              defaultMessage:
                'Copy the service account email and audience URL into the fields below.',
            })}
          </li>
        </ol>
      </EuiText>
    </EuiAccordion>
    <EuiSpacer size="m" />
    <ReadDocumentationLink url={DOCS_URLS.gcp} />
    <EuiSpacer size="m" />
    <EuiFormRow
      label={i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.gcp.serviceAccount', {
        defaultMessage: 'Service Account',
      })}
      helpText={i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.federated.gcp.serviceAccountHelp',
        {
          defaultMessage:
            'The email address of the GCP service account that Elastic will use to access your data.',
        }
      )}
      fullWidth
    >
      <EuiFieldText
        value={state.gcpServiceAccount}
        onChange={(e) => onChange('gcpServiceAccount', e.target.value)}
        data-test-subj="cloudSourceFlyoutFederatedGcpServiceAccount"
        fullWidth
        autoComplete="off"
        placeholder="my-service-account@my-project.iam.gserviceaccount.com"
      />
    </EuiFormRow>
    <EuiFormRow
      label={i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.gcp.audience', {
        defaultMessage: 'Audience',
      })}
      helpText={i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.federated.gcp.audienceHelp',
        {
          defaultMessage:
            'The intended recipient of the ID token used for Workload Identity Federation.',
        }
      )}
      fullWidth
    >
      <EuiFieldText
        value={state.gcpAudience}
        onChange={(e) => onChange('gcpAudience', e.target.value)}
        data-test-subj="cloudSourceFlyoutFederatedGcpAudience"
        fullWidth
        autoComplete="off"
      />
    </EuiFormRow>
    <EuiFormRow
      label={i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.gcp.federatedId', {
        defaultMessage: 'Federated Identity ID',
      })}
      helpText={i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.federated.gcp.federatedIdHelp',
        { defaultMessage: 'A unique identifier for this cloud connector configuration.' }
      )}
      fullWidth
    >
      <EuiFieldText
        value={state.gcpFederatedId}
        onChange={(e) => onChange('gcpFederatedId', e.target.value)}
        data-test-subj="cloudSourceFlyoutFederatedGcpId"
        fullWidth
        autoComplete="off"
      />
    </EuiFormRow>
  </>
);

// ---------------------------------------------------------------------------
// Azure New Identity fields
// ---------------------------------------------------------------------------

const AzureNewIdentityFields: FunctionComponent<{
  state: FormState;
  onChange: (field: keyof FormState, value: string) => void;
}> = ({ state, onChange }) => (
  <>
    <FederatedIdentityNameField
      value={state.federatedName}
      onChange={(v) => onChange('federatedName', v)}
    />
    <EuiSpacer size="m" />
    <EuiAccordion
      id="cloudSourceFlyoutAzureSteps"
      buttonContent={i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.federated.azure.stepsTitle',
        { defaultMessage: 'Steps to create Managed User Identity in Azure' }
      )}
      data-test-subj="cloudSourceFlyoutAzureSteps"
    >
      <EuiSpacer size="s" />
      <EuiText size="s">
        <ol>
          <li>
            {i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.azure.step1', {
              defaultMessage: 'Open the Azure Portal and navigate to Azure Active Directory.',
            })}
          </li>
          <li>
            {i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.azure.step2', {
              defaultMessage:
                'Register a new application or select an existing one to use as the service principal.',
            })}
          </li>
          <li>
            {i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.azure.step3', {
              defaultMessage:
                'Add a Federated Identity Credential to the app registration pointing to Elastic\u2019s OIDC issuer.',
            })}
          </li>
          <li>
            {i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.azure.step4', {
              defaultMessage:
                'Assign the necessary roles (e.g. Storage Blob Data Reader) to the service principal.',
            })}
          </li>
          <li>
            {i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.azure.step5', {
              defaultMessage:
                'Copy the Tenant ID and Client ID from the app registration into the fields below.',
            })}
          </li>
        </ol>
      </EuiText>
    </EuiAccordion>
    <EuiSpacer size="m" />
    <ReadDocumentationLink url={DOCS_URLS.azure} />
    <EuiSpacer size="m" />
    <EuiFormRow
      label={i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.azure.tenantId', {
        defaultMessage: 'Tenant ID',
      })}
      fullWidth
    >
      <EuiFieldPassword
        type="dual"
        value={state.azureFederatedTenantId}
        onChange={(e) => onChange('azureFederatedTenantId', e.target.value)}
        data-test-subj="cloudSourceFlyoutFederatedAzureTenantId"
        fullWidth
        autoComplete="off"
      />
    </EuiFormRow>
    <EuiFormRow
      label={i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.azure.clientId', {
        defaultMessage: 'Client ID',
      })}
      fullWidth
    >
      <EuiFieldPassword
        type="dual"
        value={state.azureFederatedClientId}
        onChange={(e) => onChange('azureFederatedClientId', e.target.value)}
        data-test-subj="cloudSourceFlyoutFederatedAzureClientId"
        fullWidth
        autoComplete="off"
      />
    </EuiFormRow>
    <EuiFormRow
      label={i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.azure.federatedId', {
        defaultMessage: 'Federated Identity ID',
      })}
      fullWidth
    >
      <EuiFieldText
        value={state.azureFederatedId}
        onChange={(e) => onChange('azureFederatedId', e.target.value)}
        data-test-subj="cloudSourceFlyoutFederatedAzureId"
        fullWidth
        autoComplete="off"
      />
    </EuiFormRow>
  </>
);

// ---------------------------------------------------------------------------
// FederatedIdentityForm — tabs + provider-specific content
// ---------------------------------------------------------------------------

const FederatedIdentityForm: FunctionComponent<{
  provider: CloudProvider;
  state: FormState;
  onChange: (field: keyof FormState, value: string) => void;
  onModeChange: (mode: FederatedMode) => void;
}> = ({ provider, state, onChange, onModeChange }) => (
  <>
    <EuiTabs>
      <EuiTab
        isSelected={state.federatedMode === 'new'}
        onClick={() => onModeChange('new')}
        data-test-subj="cloudSourceFlyoutFederatedTabNew"
      >
        <FormattedMessage
          id="dataSourceManagement.cloudSourceFlyout.federated.tabNew"
          defaultMessage="New Identity"
        />
      </EuiTab>
      <EuiTab
        isSelected={state.federatedMode === 'existing'}
        onClick={() => onModeChange('existing')}
        data-test-subj="cloudSourceFlyoutFederatedTabExisting"
      >
        <FormattedMessage
          id="dataSourceManagement.cloudSourceFlyout.federated.tabExisting"
          defaultMessage="Existing Identity"
        />
      </EuiTab>
    </EuiTabs>
    <EuiSpacer size="m" />
    {state.federatedMode === 'existing' ? (
      <ExistingIdentityPlaceholder />
    ) : (
      <>
        {provider === 'aws' && <AwsNewIdentityFields state={state} onChange={onChange} />}
        {provider === 'gcp' && <GcpNewIdentityFields state={state} onChange={onChange} />}
        {provider === 'azure' && <AzureNewIdentityFields state={state} onChange={onChange} />}
      </>
    )}
  </>
);

// ---------------------------------------------------------------------------
// Per-provider credential field components
// ---------------------------------------------------------------------------

const AwsCredentialFields: FunctionComponent<{
  credentialType: string;
  state: FormState;
  onChange: (field: keyof FormState, value: string) => void;
  onModeChange: (mode: FederatedMode) => void;
}> = ({ credentialType, state, onChange, onModeChange }) => {
  if (credentialType === 'federated_identity') {
    return (
      <FederatedIdentityForm
        provider="aws"
        state={state}
        onChange={onChange}
        onModeChange={onModeChange}
      />
    );
  }

  const methodDescription = AWS_CREDENTIAL_METHOD_DESCRIPTIONS[credentialType];

  return (
    <>
      {methodDescription && (
        <>
          <EuiText color="subdued" size="s">
            {methodDescription}
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.cloudSourceFlyout.aws.accessKeyId', {
          defaultMessage: 'Access Key ID',
        })}
        fullWidth
      >
        <EuiFieldText
          value={state.accessKeyId}
          onChange={(e) => onChange('accessKeyId', e.target.value)}
          data-test-subj="cloudSourceFlyoutAwsAccessKeyId"
          fullWidth
          autoComplete="off"
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.cloudSourceFlyout.aws.secretAccessKey', {
          defaultMessage: 'Secret Access Key',
        })}
        fullWidth
      >
        <EuiFieldPassword
          type="dual"
          value={state.secretAccessKey}
          onChange={(e) => onChange('secretAccessKey', e.target.value)}
          data-test-subj="cloudSourceFlyoutAwsSecretAccessKey"
          fullWidth
          autoComplete="off"
        />
      </EuiFormRow>
    </>
  );
};

const GcpCredentialFields: FunctionComponent<{
  credentialType: string;
  state: FormState;
  onChange: (field: keyof FormState, value: string) => void;
  onModeChange: (mode: FederatedMode) => void;
}> = ({ credentialType, state, onChange, onModeChange }) => {
  if (credentialType === 'federated_identity') {
    return (
      <FederatedIdentityForm
        provider="gcp"
        state={state}
        onChange={onChange}
        onModeChange={onModeChange}
      />
    );
  }

  const methodDescription = GCP_CREDENTIAL_METHOD_DESCRIPTIONS[credentialType];

  return (
    <>
      {methodDescription && (
        <>
          <EuiText color="subdued" size="s">
            {methodDescription}
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.cloudSourceFlyout.gcp.projectId', {
          defaultMessage: 'Project ID',
        })}
        fullWidth
      >
        <EuiFieldText
          value={state.gcpProjectId}
          onChange={(e) => onChange('gcpProjectId', e.target.value)}
          data-test-subj="cloudSourceFlyoutGcpProjectId"
          fullWidth
          autoComplete="off"
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.cloudSourceFlyout.gcp.credentialsJson', {
          defaultMessage: 'Service account credentials (JSON)',
        })}
        fullWidth
      >
        <EuiTextArea
          value={state.gcpCredentialsJson}
          onChange={(e) => onChange('gcpCredentialsJson', e.target.value)}
          data-test-subj="cloudSourceFlyoutGcpCredentialsJson"
          fullWidth
          rows={4}
          placeholder="{}"
          autoComplete="off"
        />
      </EuiFormRow>
    </>
  );
};

const AzureCredentialFields: FunctionComponent<{
  credentialType: string;
  state: FormState;
  onChange: (field: keyof FormState, value: string) => void;
  onModeChange: (mode: FederatedMode) => void;
}> = ({ credentialType, state, onChange, onModeChange }) => {
  if (credentialType === 'federated_identity') {
    return (
      <FederatedIdentityForm
        provider="azure"
        state={state}
        onChange={onChange}
        onModeChange={onModeChange}
      />
    );
  }

  const methodDescription = AZURE_CREDENTIAL_METHOD_DESCRIPTIONS[credentialType];

  return (
    <>
      {methodDescription && (
        <>
          <EuiText color="subdued" size="s">
            {methodDescription}
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.cloudSourceFlyout.azure.tenantId', {
          defaultMessage: 'Tenant ID',
        })}
        fullWidth
      >
        <EuiFieldText
          value={state.azureTenantId}
          onChange={(e) => onChange('azureTenantId', e.target.value)}
          data-test-subj="cloudSourceFlyoutAzureTenantId"
          fullWidth
          autoComplete="off"
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.cloudSourceFlyout.azure.clientId', {
          defaultMessage: 'Client ID',
        })}
        fullWidth
      >
        <EuiFieldText
          value={state.azureClientId}
          onChange={(e) => onChange('azureClientId', e.target.value)}
          data-test-subj="cloudSourceFlyoutAzureClientId"
          fullWidth
          autoComplete="off"
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.cloudSourceFlyout.azure.clientSecret', {
          defaultMessage: 'Client Secret',
        })}
        fullWidth
      >
        <EuiFieldPassword
          type="dual"
          value={state.azureClientSecret}
          onChange={(e) => onChange('azureClientSecret', e.target.value)}
          data-test-subj="cloudSourceFlyoutAzureClientSecret"
          fullWidth
          autoComplete="off"
        />
      </EuiFormRow>
    </>
  );
};

// ---------------------------------------------------------------------------
// Main flyout
// ---------------------------------------------------------------------------

export interface CreateCloudSourceFlyoutProps {
  onClose: () => void;
  onSave: (values: {
    name: string;
    dataSource: Omit<DataSourceWithSecrets, 'id'>;
  }) => Promise<string | null>;
}

export const CreateCloudSourceFlyout: FunctionComponent<CreateCloudSourceFlyoutProps> = ({
  onClose,
  onSave,
}) => {
  const { coreStart } = useDataSourceManagementAppContext();
  const [state, setState] = useState<FormState>(initialState);
  const [nameError, setNameError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const setField = useCallback((field: keyof FormState, value: string) => {
    setState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleProviderChange = useCallback((provider: CloudProvider) => {
    setState((prev) => ({
      ...prev,
      provider,
      credentialType: DEFAULT_CREDENTIAL_TYPE[provider],
      federatedMode: 'new',
    }));
  }, []);

  const handleCredentialTypeChange = useCallback((credentialType: string) => {
    setState((prev) => ({ ...prev, credentialType, federatedMode: 'new' }));
  }, []);

  const handleFederatedModeChange = useCallback((mode: FederatedMode) => {
    setState((prev) => ({ ...prev, federatedMode: mode }));
  }, []);

  const handleTestConnection = useCallback(async () => {
    const trimmedName = state.name.trim();
    if (!trimmedName) {
      setNameError(
        i18n.translate('dataSourceManagement.cloudSourceFlyout.nameRequired', {
          defaultMessage: 'Name is required.',
        })
      );
      return;
    }
    setNameError(undefined);
    setIsTestingConnection(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      coreStart.notifications.toasts.addSuccess(
        i18n.translate('dataSourceManagement.table.testConnectionSuccess', {
          defaultMessage: 'Successfully connected to "{name}".',
          values: { name: trimmedName },
        })
      );
    } finally {
      setIsTestingConnection(false);
    }
  }, [coreStart.notifications.toasts, state.name]);

  const handleSave = useCallback(async () => {
    const trimmedName = state.name.trim();
    if (!trimmedName) {
      setNameError(
        i18n.translate('dataSourceManagement.cloudSourceFlyout.nameRequired', {
          defaultMessage: 'Name is required.',
        })
      );
      return;
    }
    setNameError(undefined);
    setSaveError(undefined);
    setIsSaving(true);
    try {
      const dataSource = buildDataSource(state);
      const error = await onSave({ name: trimmedName, dataSource });
      if (error) {
        setSaveError(error);
      } else {
        setState(initialState);
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  }, [onClose, onSave, state]);

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="createCloudSourceFlyoutTitle"
      size="m"
      data-test-subj="createCloudSourceFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="createCloudSourceFlyoutTitle">
            <FormattedMessage
              id="dataSourceManagement.cloudSourceFlyout.title"
              defaultMessage="Configure cloud data source"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="dataSourceManagement.cloudSourceFlyout.description"
            defaultMessage="Select your cloud service provider and configure how Elastic will authenticate to access your data."
          />
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm component="form" id="createCloudSourceForm" onSubmit={(e) => e.preventDefault()}>
          {saveError ? (
            <>
              <EuiCallOut
                announceOnMount
                color="danger"
                title={i18n.translate('dataSourceManagement.cloudSourceFlyout.saveError', {
                  defaultMessage: 'Failed to save data source',
                })}
                data-test-subj="cloudSourceFlyoutSaveError"
              >
                <EuiText size="s">{saveError}</EuiText>
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          ) : null}

          {/* ── Section 1: Integration details ── */}
          <SectionTitle>
            <FormattedMessage
              id="dataSourceManagement.cloudSourceFlyout.sectionDetails"
              defaultMessage="Integration details"
            />
          </SectionTitle>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('dataSourceManagement.cloudSourceFlyout.dataSourceTypeLabel', {
              defaultMessage: 'Data source type',
            })}
            fullWidth
          >
            <CloudProviderSelect value={state.provider} onChange={handleProviderChange} />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('dataSourceManagement.cloudSourceFlyout.nameLabel', {
              defaultMessage: 'Name',
            })}
            isInvalid={Boolean(nameError)}
            error={nameError}
            fullWidth
          >
            <EuiFieldText
              name="cloudSourceName"
              value={state.name}
              onChange={(e) => setField('name', e.target.value)}
              isInvalid={Boolean(nameError)}
              data-test-subj="cloudSourceFlyoutName"
              autoFocus
              fullWidth
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('dataSourceManagement.cloudSourceFlyout.descriptionLabel', {
              defaultMessage: 'Description',
            })}
            fullWidth
          >
            <EuiTextArea
              name="cloudSourceDescription"
              value={state.description}
              onChange={(e) => setField('description', e.target.value)}
              data-test-subj="cloudSourceFlyoutDescription"
              fullWidth
              rows={3}
            />
          </EuiFormRow>

          <EuiHorizontalRule margin="l" />

          {/* ── Section 2: Authentication ── */}
          <SectionTitle>
            <FormattedMessage
              id="dataSourceManagement.cloudSourceFlyout.sectionAuthentication"
              defaultMessage="Authentication"
            />
          </SectionTitle>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('dataSourceManagement.cloudSourceFlyout.credentialTypeLabel', {
              defaultMessage: 'Preferred method',
            })}
            fullWidth
          >
            <EuiSelect
              options={CREDENTIAL_OPTIONS[state.provider]}
              value={state.credentialType}
              onChange={(e) => handleCredentialTypeChange(e.target.value)}
              data-test-subj="cloudSourceFlyoutCredentialType"
              fullWidth
            />
          </EuiFormRow>
          <EuiSpacer size="m" />

          {state.provider === 'aws' && (
            <AwsCredentialFields
              credentialType={state.credentialType}
              state={state}
              onChange={setField}
              onModeChange={handleFederatedModeChange}
            />
          )}
          {state.provider === 'gcp' && (
            <GcpCredentialFields
              credentialType={state.credentialType}
              state={state}
              onChange={setField}
              onModeChange={handleFederatedModeChange}
            />
          )}
          {state.provider === 'azure' && (
            <AzureCredentialFields
              credentialType={state.credentialType}
              state={state}
              onChange={setField}
              onModeChange={handleFederatedModeChange}
            />
          )}

          <EuiSpacer size="m" />
          {state.credentialType !== 'federated_identity' ? (
            <ReadDocumentationLink url={DOCS_URLS[state.provider]} />
          ) : null}
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="left" data-test-subj="cloudSourceFlyoutClose" onClick={onClose} disabled={isSaving || isTestingConnection}>
              <FormattedMessage
                id="dataSourceManagement.cloudSourceFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="play"
                  type="button"
                  data-test-subj="cloudSourceFlyoutTestConnection"
                  onClick={() => void handleTestConnection()}
                  isLoading={isTestingConnection}
                  disabled={isSaving || isTestingConnection}
                >
                  <FormattedMessage
                    id="dataSourceManagement.cloudSourceFlyout.testConnectionButton"
                    defaultMessage="Test connection"
                  />
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  type="button"
                  data-test-subj="cloudSourceFlyoutSubmit"
                  onClick={() => void handleSave()}
                  isLoading={isSaving}
                  disabled={isSaving || isTestingConnection}
                >
                  <FormattedMessage
                    id="dataSourceManagement.cloudSourceFlyout.saveButton"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
