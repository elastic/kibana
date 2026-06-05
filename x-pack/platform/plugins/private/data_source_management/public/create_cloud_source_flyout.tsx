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
  EuiCheckableCard,
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CloudProvider = 'aws' | 'gcp' | 'azure';
type AccountType = 'single' | 'organization';
type FederatedMode = 'new' | 'existing';

interface FormState {
  provider: CloudProvider;
  accountType: AccountType;
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
  accountType: 'organization',
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

interface AccountTypeOption {
  id: AccountType;
  label: string;
  disabled?: boolean;
  disabledTooltip?: string;
}

const PROVIDER_ACCOUNT_TYPES: Record<CloudProvider, AccountTypeOption[]> = {
  aws: [
    {
      id: 'organization',
      label: i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.accountType.aws.organization',
        { defaultMessage: 'AWS Organization' }
      ),
    },
    {
      id: 'single',
      label: i18n.translate('dataSourceManagement.cloudSourceFlyout.accountType.aws.single', {
        defaultMessage: 'Single Account',
      }),
    },
  ],
  gcp: [
    {
      id: 'organization',
      label: i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.accountType.gcp.organization',
        { defaultMessage: 'GCP Organization' }
      ),
    },
    {
      id: 'single',
      label: i18n.translate('dataSourceManagement.cloudSourceFlyout.accountType.gcp.single', {
        defaultMessage: 'Single Project',
      }),
    },
  ],
  azure: [
    {
      id: 'organization',
      label: i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.accountType.azure.organization',
        { defaultMessage: 'Azure Organization' }
      ),
    },
    {
      id: 'single',
      label: i18n.translate('dataSourceManagement.cloudSourceFlyout.accountType.azure.single', {
        defaultMessage: 'Single Subscription',
      }),
    },
  ],
};

const PROVIDER_ACCOUNT_TYPE_INTRO: Record<CloudProvider, string> = {
  aws: i18n.translate('dataSourceManagement.cloudSourceFlyout.accountTypeIntro.aws', {
    defaultMessage:
      'Select between single account or organization, and then fill in the name and description to help identify this data source.',
  }),
  gcp: i18n.translate('dataSourceManagement.cloudSourceFlyout.accountTypeIntro.gcp', {
    defaultMessage:
      'Select between single project or organization, and then fill in the name and description to help identify this data source.',
  }),
  azure: i18n.translate('dataSourceManagement.cloudSourceFlyout.accountTypeIntro.azure', {
    defaultMessage:
      'Select between single subscription or organization, and then fill in the name and description to help identify this data source.',
  }),
};

const PROVIDER_ACCOUNT_TYPE_DESCRIPTIONS: Record<
  CloudProvider,
  Partial<Record<AccountType, string>>
> = {
  aws: {
    organization: i18n.translate(
      'dataSourceManagement.cloudSourceFlyout.accountType.aws.organization.description',
      {
        defaultMessage:
          'Connect Elastic to every AWS Account (current and future) in your environment by providing Elastic with read-only access to your AWS organization.',
      }
    ),
    single: i18n.translate(
      'dataSourceManagement.cloudSourceFlyout.accountType.aws.single.description',
      {
        defaultMessage:
          'Deploying to a single account is suitable for an initial POC. To ensure complete coverage, it is strongly recommended to deploy at the organization-level, which automatically connects all accounts (both current and future).',
      }
    ),
  },
  gcp: {
    organization: i18n.translate(
      'dataSourceManagement.cloudSourceFlyout.accountType.gcp.organization.description',
      {
        defaultMessage:
          'Connect Elastic to every GCP Project (current and future) in your environment by providing Elastic with read-only access to your GCP organization.',
      }
    ),
    single: i18n.translate(
      'dataSourceManagement.cloudSourceFlyout.accountType.gcp.single.description',
      {
        defaultMessage:
          'Deploying to a single project is suitable for an initial POC. To ensure complete coverage, it is strongly recommended to deploy at the organization-level, which automatically connects all projects (both current and future).',
      }
    ),
  },
  azure: {
    organization: i18n.translate(
      'dataSourceManagement.cloudSourceFlyout.accountType.azure.organization.description',
      {
        defaultMessage:
          'Connect Elastic to every Azure Subscription (current and future) in your environment by providing Elastic with read-only access to your Azure organization.',
      }
    ),
    single: i18n.translate(
      'dataSourceManagement.cloudSourceFlyout.accountType.azure.single.description',
      {
        defaultMessage:
          'Connect Elastic to a single Azure Subscription to monitor and secure its resources.',
      }
    ),
  },
};

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
      value: 'assume_role',
      text: i18n.translate('dataSourceManagement.cloudSourceFlyout.credentials.aws.assumeRole', {
        defaultMessage: 'Assume role',
      }),
    },
    {
      value: 'direct_access_keys',
      text: i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.credentials.aws.directAccessKeys',
        { defaultMessage: 'Direct access keys' }
      ),
    },
    {
      value: 'temporary_keys',
      text: i18n.translate('dataSourceManagement.cloudSourceFlyout.credentials.aws.temporaryKeys', {
        defaultMessage: 'Temporary keys',
      }),
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
  assume_role: i18n.translate(
    'dataSourceManagement.cloudSourceFlyout.credentials.aws.assumeRole.description',
    {
      defaultMessage:
        'An IAM role Amazon Resource Name (ARN) is an IAM identity that you can create in your AWS account. When creating an IAM role, users can define the role\u2019s permissions. Roles do not have standard long-term credentials such as passwords or access keys.',
    }
  ),
  direct_access_keys: i18n.translate(
    'dataSourceManagement.cloudSourceFlyout.credentials.aws.directAccessKeys.description',
    {
      defaultMessage:
        'Access keys are long-term credentials for an IAM user or the AWS account root user.',
    }
  ),
  temporary_keys: i18n.translate(
    'dataSourceManagement.cloudSourceFlyout.credentials.aws.temporaryKeys.description',
    {
      defaultMessage:
        'You can configure temporary security credentials in AWS to last for a specified duration. They consist of an access key ID, a secret access key, and a security token, which is typically found using GetSessionToken.',
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
    roleArn,
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
        // role ARN reuses access_key slot for assume_role (prototype mapping)
        access_key:
          credentialType === 'assume_role' ? roleArn || undefined : accessKeyId || undefined,
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
  <>
    <EuiCallOut
      announceOnMount
      color="primary"
      iconType="iInCircle"
      title={i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.existingIdentity.placeholderTitle',
        { defaultMessage: 'Existing identities' }
      )}
      data-test-subj="cloudSourceFlyoutExistingIdentityCallout"
    >
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="dataSourceManagement.cloudSourceFlyout.existingIdentity.placeholderBody"
            defaultMessage="To streamline your cloud integration, you can reuse a previously configured Federated Identity. This requires a cloud connectors API which is not yet available in this prototype."
          />
        </p>
      </EuiText>
    </EuiCallOut>
    <EuiSpacer size="m" />
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
  </>
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
              defaultMessage: 'Copy the Role ARN and paste it in the field above.',
            })}
          </li>
          <li>
            {i18n.translate('dataSourceManagement.cloudSourceFlyout.federated.aws.step5', {
              defaultMessage: 'Optionally provide an External ID to further restrict role assumption.',
            })}
          </li>
        </ol>
      </EuiText>
    </EuiAccordion>
    <EuiSpacer size="m" />
    <EuiButton
      href="#"
      iconType="popout"
      iconSide="right"
      target="_blank"
      data-test-subj="cloudSourceFlyoutLaunchCloudFormation"
    >
      <FormattedMessage
        id="dataSourceManagement.cloudSourceFlyout.federated.aws.launchCloudFormation"
        defaultMessage="Launch CloudFormation"
      />
    </EuiButton>
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
    <EuiFormRow
      label={i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.federated.gcp.serviceAccount',
        { defaultMessage: 'Service Account' }
      )}
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
    <EuiSpacer size="m" />
    <EuiAccordion
      id="cloudSourceFlyoutGcpSteps"
      buttonContent={i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.federated.gcp.stepsTitle',
        { defaultMessage: 'Steps to generate GCP Service Account' }
      )}
      initialIsOpen
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
                'Copy the service account email and audience URL into the fields above.',
            })}
          </li>
        </ol>
      </EuiText>
    </EuiAccordion>
    <EuiSpacer size="m" />
    <EuiButton
      href="#"
      iconType="popout"
      iconSide="right"
      target="_blank"
      data-test-subj="cloudSourceFlyoutLaunchCloudShell"
    >
      <FormattedMessage
        id="dataSourceManagement.cloudSourceFlyout.federated.gcp.launchCloudShell"
        defaultMessage="Launch Google Cloud Shell"
      />
    </EuiButton>
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
    <EuiText size="s" color="subdued">
      <FormattedMessage
        id="dataSourceManagement.cloudSourceFlyout.federated.azure.description"
        defaultMessage="Configure Azure Federated Identity credentials to securely connect Elastic to Azure without long-lived client secrets."
      />
    </EuiText>
    <EuiSpacer size="m" />
    <FederatedIdentityNameField
      value={state.federatedName}
      onChange={(v) => onChange('federatedName', v)}
    />
    <EuiFormRow
      label={i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.federated.azure.tenantId',
        { defaultMessage: 'Tenant ID' }
      )}
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
      label={i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.federated.azure.clientId',
        { defaultMessage: 'Client ID' }
      )}
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
      label={i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.federated.azure.federatedId',
        { defaultMessage: 'Federated Identity ID' }
      )}
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
    <EuiSpacer size="m" />
    <EuiAccordion
      id="cloudSourceFlyoutAzureSteps"
      buttonContent={i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.federated.azure.stepsTitle',
        { defaultMessage: 'Steps to create Managed User Identity in Azure' }
      )}
      initialIsOpen
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
                'Copy the Tenant ID and Client ID from the app registration into the fields above.',
            })}
          </li>
        </ol>
      </EuiText>
    </EuiAccordion>
    <EuiSpacer size="m" />
    <EuiButton
      href="#"
      iconType="popout"
      iconSide="right"
      target="_blank"
      data-test-subj="cloudSourceFlyoutDeployToAzure"
    >
      <FormattedMessage
        id="dataSourceManagement.cloudSourceFlyout.federated.azure.deployToAzure"
        defaultMessage="Deploy to Azure"
      />
    </EuiButton>
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

  if (credentialType === 'assume_role') {
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
          label={i18n.translate('dataSourceManagement.cloudSourceFlyout.aws.roleArn', {
            defaultMessage: 'Role ARN',
          })}
          helpText={i18n.translate('dataSourceManagement.cloudSourceFlyout.aws.roleArnHelp', {
            defaultMessage: 'The Amazon Resource Name of the IAM role that Elastic will assume.',
          })}
          fullWidth
        >
          <EuiFieldText
            value={state.roleArn}
            onChange={(e) => onChange('roleArn', e.target.value)}
            data-test-subj="cloudSourceFlyoutAwsRoleArn"
            fullWidth
            autoComplete="off"
            placeholder="arn:aws:iam::123456789012:role/MyRole"
          />
        </EuiFormRow>
      </>
    );
  }

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
      {credentialType === 'temporary_keys' && (
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.cloudSourceFlyout.aws.sessionToken', {
            defaultMessage: 'Session Token',
          })}
          fullWidth
        >
          <EuiFieldText
            value={state.sessionToken}
            onChange={(e) => onChange('sessionToken', e.target.value)}
            data-test-subj="cloudSourceFlyoutAwsSessionToken"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
      )}
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
  const [state, setState] = useState<FormState>(initialState);
  const [nameError, setNameError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const setField = useCallback((field: keyof FormState, value: string) => {
    setState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleProviderChange = useCallback((provider: CloudProvider) => {
    const defaultAccountType: AccountType = 'organization';
    setState((prev) => ({
      ...prev,
      provider,
      credentialType: DEFAULT_CREDENTIAL_TYPE[provider],
      federatedMode: 'new',
      accountType: defaultAccountType,
    }));
  }, []);

  const handleCredentialTypeChange = useCallback((credentialType: string) => {
    setState((prev) => ({ ...prev, credentialType, federatedMode: 'new' }));
  }, []);

  const handleFederatedModeChange = useCallback((mode: FederatedMode) => {
    setState((prev) => ({ ...prev, federatedMode: mode }));
  }, []);

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
      size="l"
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

          {/* ── Section 1: Provider ── */}
          <SectionTitle>
            <FormattedMessage
              id="dataSourceManagement.cloudSourceFlyout.sectionProvider"
              defaultMessage="Select cloud service provider"
            />
          </SectionTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="dataSourceManagement.cloudSourceFlyout.providerDescription"
              defaultMessage="Select the cloud service provider you want to connect to and then fill in the name and description to help identify this data source."
            />
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m" wrap={false} responsive={false}>
            {PROVIDERS.map(({ id, shortName, icon }) => (
              <EuiFlexItem key={id}>
                <EuiCheckableCard
                  id={`cloudProvider-${id}`}
                  name="cloudProvider"
                  label={
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type={icon} size="l" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>{shortName}</EuiFlexItem>
                    </EuiFlexGroup>
                  }
                  checkableType="radio"
                  value={id}
                  checked={state.provider === id}
                  onChange={() => handleProviderChange(id)}
                  data-test-subj={`cloudSourceFlyoutProvider-${id}`}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>

          <EuiHorizontalRule margin="l" />

          {/* ── Section 2: Account type ── */}
          <SectionTitle>
            <FormattedMessage
              id="dataSourceManagement.cloudSourceFlyout.sectionAccountType"
              defaultMessage="Account type"
            />
          </SectionTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {PROVIDER_ACCOUNT_TYPE_INTRO[state.provider]}
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m" wrap={false} responsive={false}>
            {PROVIDER_ACCOUNT_TYPES[state.provider].map(({ id, label, disabled, disabledTooltip }) => (
              <EuiFlexItem key={id}>
                <EuiCheckableCard
                  id={`accountType-${state.provider}-${id}`}
                  name={`accountType-${state.provider}`}
                  label={label}
                  checkableType="radio"
                  value={id}
                  checked={state.accountType === id}
                  disabled={disabled}
                  title={disabledTooltip}
                  onChange={() =>
                    !disabled && setState((prev) => ({ ...prev, accountType: id }))
                  }
                  data-test-subj={`cloudSourceFlyoutAccountType-${id}`}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          {PROVIDER_ACCOUNT_TYPE_DESCRIPTIONS[state.provider][state.accountType] && (
            <>
              <EuiSpacer size="m" />
              <EuiText color="subdued" size="s">
                {PROVIDER_ACCOUNT_TYPE_DESCRIPTIONS[state.provider][state.accountType]}
              </EuiText>
            </>
          )}

          <EuiHorizontalRule margin="l" />

          {/* ── Section 3: Integration details ── */}
          <SectionTitle>
            <FormattedMessage
              id="dataSourceManagement.cloudSourceFlyout.sectionDetails"
              defaultMessage="Integration details"
            />
          </SectionTitle>
          <EuiSpacer size="m" />
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

          {/* ── Section 4: Authentication ── */}
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
          <ReadDocumentationLink url={DOCS_URLS[state.provider]} />
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="left" data-test-subj="cloudSourceFlyoutClose" onClick={onClose}>
              <FormattedMessage
                id="dataSourceManagement.cloudSourceFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              type="button"
              data-test-subj="cloudSourceFlyoutSubmit"
              onClick={() => void handleSave()}
              isLoading={isSaving}
              disabled={isSaving}
            >
              <FormattedMessage
                id="dataSourceManagement.cloudSourceFlyout.saveButton"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
