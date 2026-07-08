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
  EuiSelect,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataSourceWithSecrets } from '../common';
import { createDataSourceFlyoutStrings } from './create_data_source_flyout_i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CloudProvider = 'aws' | 'gcp' | 'azure';

interface FormState {
  provider: CloudProvider;
  name: string;
  description: string;
  credentialType: string;
  s3Region: string;
  s3Endpoint: string;
  gcpProjectId: string;
  gcpEndpoint: string;
  gcpTokenUri: string;
  azureEndpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  gcpCredentialsJson: string;
  azureAccount: string;
  azureKey: string;
}

const initialState = (): FormState => ({
  provider: 'aws',
  name: '',
  description: '',
  credentialType: 'access_and_secret_keys',
  s3Region: '',
  s3Endpoint: '',
  gcpProjectId: '',
  gcpEndpoint: '',
  gcpTokenUri: '',
  azureEndpoint: '',
  accessKeyId: '',
  secretAccessKey: '',
  gcpCredentialsJson: '',
  azureAccount: '',
  azureKey: '',
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
    { value: 'access_and_secret_keys', text: 'Access and Secret Keys' },
    { value: 'anonymous', text: 'Anonymous' },
  ],
  gcp: [
    { value: 'access_and_secret_keys', text: 'Access and Secret Keys' },
    { value: 'anonymous', text: 'Anonymous' },
  ],
  azure: [
    { value: 'credentials', text: 'Credentials' },
    { value: 'anonymous', text: 'Anonymous' },
  ],
};

const DEFAULT_CREDENTIAL_TYPE: Record<CloudProvider, string> = {
  aws: 'access_and_secret_keys',
  gcp: 'access_and_secret_keys',
  azure: 'credentials',
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

// ---------------------------------------------------------------------------
// Helper: build DataSourceWithSecrets from form state
// ---------------------------------------------------------------------------

const buildDataSource = (state: FormState): Omit<DataSourceWithSecrets, 'id'> => {
  const {
    provider,
    description,
    credentialType,
    s3Region,
    s3Endpoint,
    accessKeyId,
    secretAccessKey,
    gcpProjectId,
    gcpEndpoint,
    gcpTokenUri,
    gcpCredentialsJson,
    azureEndpoint,
    azureAccount,
    azureKey,
  } = state;

  if (provider === 'aws') {
    return {
      type: 's3',
      description,
      settings: {
        region: s3Region || undefined,
        endpoint: s3Endpoint || undefined,
        ...(credentialType === 'anonymous'
          ? { auth: 'none' }
          : {
              access_key: accessKeyId || undefined,
              secret_key: secretAccessKey || undefined,
            }),
      },
    };
  }

  if (provider === 'gcp') {
    let credentials: {} | undefined;
    if (credentialType === 'access_and_secret_keys' && gcpCredentialsJson.trim()) {
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
        project_id: gcpProjectId || undefined,
        endpoint: gcpEndpoint || undefined,
        token_uri: gcpTokenUri || undefined,
        ...(credentialType === 'anonymous' ? { auth: 'none' } : { credentials }),
      },
    };
  }

  return {
    type: 'azure',
    description,
    settings: {
      endpoint: azureEndpoint || undefined,
      ...(credentialType === 'anonymous'
        ? { auth: 'none' }
        : {
            account: azureAccount || undefined,
            key: azureKey || undefined,
          }),
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

const ConnectionSettingsFields: FunctionComponent<{
  provider: CloudProvider;
  state: FormState;
  onChange: (field: keyof FormState, value: string) => void;
}> = ({ provider, state, onChange }) => {
  if (provider === 'aws') {
    return (
      <>
        <EuiFormRow label={createDataSourceFlyoutStrings.regionLabel()} fullWidth>
          <EuiFieldText
            value={state.s3Region}
            onChange={(e) => onChange('s3Region', e.target.value)}
            data-test-subj="cloudSourceFlyoutS3Region"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow label={createDataSourceFlyoutStrings.endpointLabel()} fullWidth>
          <EuiFieldText
            value={state.s3Endpoint}
            onChange={(e) => onChange('s3Endpoint', e.target.value)}
            data-test-subj="cloudSourceFlyoutS3Endpoint"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
      </>
    );
  }

  if (provider === 'gcp') {
    return (
      <>
        <EuiFormRow label={createDataSourceFlyoutStrings.projectIdLabel()} fullWidth>
          <EuiFieldText
            value={state.gcpProjectId}
            onChange={(e) => onChange('gcpProjectId', e.target.value)}
            data-test-subj="cloudSourceFlyoutGcpProjectId"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow label={createDataSourceFlyoutStrings.endpointLabel()} fullWidth>
          <EuiFieldText
            value={state.gcpEndpoint}
            onChange={(e) => onChange('gcpEndpoint', e.target.value)}
            data-test-subj="cloudSourceFlyoutGcpEndpoint"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow label={createDataSourceFlyoutStrings.tokenUriLabel()} fullWidth>
          <EuiFieldText
            value={state.gcpTokenUri}
            onChange={(e) => onChange('gcpTokenUri', e.target.value)}
            data-test-subj="cloudSourceFlyoutGcpTokenUri"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
      </>
    );
  }

  return (
    <EuiFormRow label={createDataSourceFlyoutStrings.endpointLabel()} fullWidth>
      <EuiFieldText
        value={state.azureEndpoint}
        onChange={(e) => onChange('azureEndpoint', e.target.value)}
        data-test-subj="cloudSourceFlyoutAzureEndpoint"
        fullWidth
        autoComplete="off"
      />
    </EuiFormRow>
  );
};

const AwsCredentialFields: FunctionComponent<{
  credentialType: string;
  state: FormState;
  onChange: (field: keyof FormState, value: string) => void;
}> = ({ credentialType, state, onChange }) => {
  if (credentialType === 'anonymous') {
    return <></>;
  }

  return (
    <>
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
}> = ({ credentialType, state, onChange }) => {
  if (credentialType === 'anonymous') {
    return <></>;
  }

  return (
    <EuiFormRow label={createDataSourceFlyoutStrings.credentialsLabel()} fullWidth>
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
  );
};

const AzureCredentialFields: FunctionComponent<{
  credentialType: string;
  state: FormState;
  onChange: (field: keyof FormState, value: string) => void;
}> = ({ credentialType, state, onChange }) => {
  if (credentialType === 'anonymous') {
    return <></>;
  }

  return (
    <>
      <EuiFormRow label={createDataSourceFlyoutStrings.accountLabel()} fullWidth>
        <EuiFieldText
          value={state.azureAccount}
          onChange={(e) => onChange('azureAccount', e.target.value)}
          data-test-subj="cloudSourceFlyoutAzureAccount"
          fullWidth
          autoComplete="off"
        />
      </EuiFormRow>
      <EuiFormRow label={createDataSourceFlyoutStrings.keyLabel()} fullWidth>
        <EuiFieldPassword
          type="dual"
          value={state.azureKey}
          onChange={(e) => onChange('azureKey', e.target.value)}
          data-test-subj="cloudSourceFlyoutAzureKey"
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
  existingDataSourceNames?: string[];
}

export const CreateCloudSourceFlyout: FunctionComponent<CreateCloudSourceFlyoutProps> = ({
  onClose,
  onSave,
  existingDataSourceNames,
}) => {
  const [state, setState] = useState<FormState>(initialState);
  const [nameError, setNameError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [showConnectionSettings, setShowConnectionSettings] = useState(false);

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

  const handleCredentialTypeChange = useCallback((credentialType: string) => {
    setState((prev) => ({ ...prev, credentialType }));
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedName = state.name.trim();
    if (!trimmedName) {
      setNameError(createDataSourceFlyoutStrings.nameRequired());
      return;
    }
    if (existingDataSourceNames?.some((n) => n.toLowerCase() === trimmedName.toLowerCase())) {
      setNameError(createDataSourceFlyoutStrings.nameAlreadyExists());
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
  }, [existingDataSourceNames, onClose, onSave, state]);

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
          <h2 id="createCloudSourceFlyoutTitle">{createDataSourceFlyoutStrings.title()}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>{createDataSourceFlyoutStrings.createDescription()}</p>
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

          <EuiFormRow
            label={i18n.translate('dataSourceManagement.cloudSourceFlyout.dataSourceTypeLabel', {
              defaultMessage: 'Data source type',
            })}
            fullWidth
          >
            <CloudProviderSelect value={state.provider} onChange={handleProviderChange} />
          </EuiFormRow>
          <EuiFormRow
            label={createDataSourceFlyoutStrings.nameLabel()}
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
          <EuiFormRow label={createDataSourceFlyoutStrings.descriptionLabel()} fullWidth>
            <EuiTextArea
              name="cloudSourceDescription"
              value={state.description}
              onChange={(e) => setField('description', e.target.value)}
              data-test-subj="cloudSourceFlyoutDescription"
              fullWidth
              rows={1}
            />
          </EuiFormRow>

          <EuiButtonEmpty
            size="s"
            iconType={showConnectionSettings ? 'arrowDown' : 'arrowRight'}
            onClick={() => setShowConnectionSettings((prev) => !prev)}
            data-test-subj="cloudSourceFlyoutConnectionSettingsToggle"
            flush="left"
          >
            {showConnectionSettings
              ? createDataSourceFlyoutStrings.connectionSettingsHide()
              : createDataSourceFlyoutStrings.connectionSettingsShow()}
          </EuiButtonEmpty>
          {showConnectionSettings ? (
            <>
              <EuiSpacer size="m" />
              <ConnectionSettingsFields provider={state.provider} state={state} onChange={setField} />
            </>
          ) : null}

          <EuiSpacer size="l" />
          <SectionTitle>
            <FormattedMessage
              id="dataSourceManagement.cloudSourceFlyout.sectionAuthentication"
              defaultMessage="Authentication"
            />
          </SectionTitle>
          <EuiSpacer size="m" />
          <EuiFormRow label={createDataSourceFlyoutStrings.authMethodLabel()} fullWidth>
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
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              data-test-subj="cloudSourceFlyoutClose"
              onClick={onClose}
              disabled={isSaving}
            >
              {createDataSourceFlyoutStrings.cancelButton()}
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
              {createDataSourceFlyoutStrings.connectButton()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
