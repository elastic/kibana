/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckableCard,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormAppend,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataSourceWithSecrets } from '../common';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CloudProvider = 'aws' | 'gcp' | 'azure';
type AccountType = 'single' | 'organization';

interface FormState {
  provider: CloudProvider;
  accountType: AccountType;
  name: string;
  description: string;
  credentialType: string;
  // AWS
  roleArn: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  // GCP
  gcpProjectId: string;
  gcpCredentialsJson: string;
  // Azure
  azureTenantId: string;
  azureClientId: string;
  azureClientSecret: string;
}

const initialState = (): FormState => ({
  provider: 'aws',
  accountType: 'single',
  name: '',
  description: '',
  credentialType: 'federated_identity',
  roleArn: '',
  accessKeyId: '',
  secretAccessKey: '',
  sessionToken: '',
  gcpProjectId: '',
  gcpCredentialsJson: '',
  azureTenantId: '',
  azureClientId: '',
  azureClientSecret: '',
});

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const PROVIDERS: Array<{ id: CloudProvider; shortName: string; icon: string }> = [
  { id: 'aws', shortName: 'AWS', icon: 'logoAWS' },
  { id: 'gcp', shortName: 'GCP', icon: 'logoGCP' },
  { id: 'azure', shortName: 'Azure', icon: 'logoAzure' },
];

const ACCOUNT_TYPE_DYNAMIC_DESCRIPTION: Record<AccountType, string> = {
  single: i18n.translate(
    'dataSourceManagement.cloudSourceFlyout.accountType.single.dynamicDescription',
    {
      defaultMessage:
        'Deploying to a single account is suitable for an initial POC. To ensure complete coverage, it is strongly recommended to deploy at the organization-level, which automatically connects all accounts (both current and future).',
    }
  ),
  organization: i18n.translate(
    'dataSourceManagement.cloudSourceFlyout.accountType.organization.dynamicDescription',
    {
      defaultMessage:
        'Connect Elastic to every cloud account (current and future) in your environment by providing Elastic with read-only access to your organization.',
    }
  ),
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
        'An IAM role Amazon Resource Name (ARN) is an IAM identity that you can create in your AWS account. When creating an IAM role, users can define the role's permissions. Roles do not have standard long-term credentials such as passwords or access keys.',
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
  azure:
    'https://www.elastic.co/docs/current/serverless/security/cloud-native-security-overview',
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

/** Appended to the credential-type dropdown when Federated Identity is selected. */
const TechnicalPreviewBadge: FunctionComponent = () => {
  const label = i18n.translate('dataSourceManagement.cloudSourceFlyout.technicalPreview', {
    defaultMessage: 'Technical preview',
  });
  return (
    <EuiToolTip
      content={i18n.translate(
        'dataSourceManagement.cloudSourceFlyout.technicalPreviewTooltip',
        {
          defaultMessage:
            'This functionality is in technical preview and may be changed in a future release. Please help us by reporting any bugs.',
        }
      )}
      title={label}
    >
      <span tabIndex={0}>{label}</span>
    </EuiToolTip>
  );
};

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

const FederatedIdentityInfo: FunctionComponent<{ provider: CloudProvider }> = ({ provider }) => {
  const descriptions: Record<CloudProvider, string> = {
    aws: i18n.translate(
      'dataSourceManagement.cloudSourceFlyout.federatedIdentity.aws.description',
      {
        defaultMessage:
          'Elastic will use your AWS IAM Identity Center (SSO) to authenticate securely without long-lived credentials. No access keys are required.',
      }
    ),
    gcp: i18n.translate(
      'dataSourceManagement.cloudSourceFlyout.federatedIdentity.gcp.description',
      {
        defaultMessage:
          'Elastic will use Workload Identity Federation to authenticate to Google Cloud without a service account key.',
      }
    ),
    azure: i18n.translate(
      'dataSourceManagement.cloudSourceFlyout.federatedIdentity.azure.description',
      {
        defaultMessage:
          'Elastic will use a Managed Identity or Workload Identity to authenticate to Azure without client secrets.',
      }
    ),
  };

  return (
    <EuiCallOut
      announceOnMount
      title={i18n.translate('dataSourceManagement.cloudSourceFlyout.federatedIdentity.title', {
        defaultMessage: 'Federated Identity setup',
      })}
      iconType="iInCircle"
      color="primary"
      data-test-subj="cloudSourceFlyoutFederatedIdentityCallout"
    >
      <EuiText size="s">
        <p>{descriptions[provider]}</p>
      </EuiText>
    </EuiCallOut>
  );
};

const AwsCredentialFields: FunctionComponent<{
  credentialType: string;
  state: FormState;
  onChange: (field: keyof FormState, value: string) => void;
}> = ({ credentialType, state, onChange }) => {
  if (credentialType === 'federated_identity') {
    return <FederatedIdentityInfo provider="aws" />;
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
}> = ({ credentialType, state, onChange }) => {
  if (credentialType === 'federated_identity') {
    return <FederatedIdentityInfo provider="gcp" />;
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
}> = ({ credentialType, state, onChange }) => {
  if (credentialType === 'federated_identity') {
    return <FederatedIdentityInfo provider="azure" />;
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
    setState((prev) => ({
      ...prev,
      provider,
      credentialType: DEFAULT_CREDENTIAL_TYPE[provider],
    }));
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
                <EuiButton
                  color={state.provider === id ? 'primary' : 'text'}
                  onClick={() => handleProviderChange(id)}
                  iconType={icon}
                  iconSide="right"
                  fullWidth
                  contentProps={{ style: { justifyContent: 'flex-start' } }}
                  css={{
                    svg: { marginLeft: 'auto' },
                    img: { marginLeft: 'auto' },
                  }}
                  data-test-subj={`cloudSourceFlyoutProvider-${id}`}
                >
                  {shortName}
                </EuiButton>
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
            <FormattedMessage
              id="dataSourceManagement.cloudSourceFlyout.accountTypeDescription"
              defaultMessage="Select between single account or organization, and then fill in the name and description to help identify this data source."
            />
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m" wrap={false} responsive={false}>
            {(['single', 'organization'] as AccountType[]).map((id) => (
              <EuiFlexItem key={id}>
                <EuiCheckableCard
                  id={`accountType-${id}`}
                  name="accountType"
                  label={
                    id === 'single'
                      ? i18n.translate(
                          'dataSourceManagement.cloudSourceFlyout.accountType.single',
                          { defaultMessage: 'Single account' }
                        )
                      : i18n.translate(
                          'dataSourceManagement.cloudSourceFlyout.accountType.organization',
                          { defaultMessage: 'Organization' }
                        )
                  }
                  checkableType="radio"
                  value={id}
                  checked={state.accountType === id}
                  onChange={() => setState((prev) => ({ ...prev, accountType: id }))}
                  data-test-subj={`cloudSourceFlyoutAccountType-${id}`}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiText color="subdued" size="s">
            {ACCOUNT_TYPE_DYNAMIC_DESCRIPTION[state.accountType]}
          </EuiText>

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
              onChange={(e) => setField('credentialType', e.target.value)}
              data-test-subj="cloudSourceFlyoutCredentialType"
              fullWidth
              append={
                state.credentialType === 'federated_identity' ? (
                  <EuiFormAppend>
                    <TechnicalPreviewBadge />
                  </EuiFormAppend>
                ) : undefined
              }
            />
          </EuiFormRow>
          <EuiSpacer size="m" />

          {state.provider === 'aws' && (
            <AwsCredentialFields
              credentialType={state.credentialType}
              state={state}
              onChange={setField}
            />
          )}
          {state.provider === 'gcp' && (
            <GcpCredentialFields
              credentialType={state.credentialType}
              state={state}
              onChange={setField}
            />
          )}
          {state.provider === 'azure' && (
            <AzureCredentialFields
              credentialType={state.credentialType}
              state={state}
              onChange={setField}
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
