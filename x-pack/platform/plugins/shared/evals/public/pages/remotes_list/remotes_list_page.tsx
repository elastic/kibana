/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiConfirmModal,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiPageSection,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
  type EuiBasicTableColumn,
  useEuiTheme,
} from '@elastic/eui';
import { goldenClusterPrivileges } from '@kbn/evals-common';
import {
  useCreateRemote,
  useDeleteRemote,
  useRemotes,
  useTestRemoteConnection,
  useUpdateRemote,
  type EvalsRemoteSummary,
} from '../../hooks/use_evals_api';
import * as i18n from './translations';

const API_KEY_PAYLOAD = {
  name: 'kbn-evals-remote-access',
  expiration: '90d',
  ...goldenClusterPrivileges,
  metadata: { application: 'kbn-evals', purpose: 'remote dataset access' },
};

const DEV_TOOLS_COMMAND = `POST kbn:/internal/security/api_key\n${JSON.stringify(
  API_KEY_PAYLOAD,
  null,
  2
)}`;

const GOLDEN_CLUSTER_DEV_TOOLS_URL =
  'https://kbn-evals-serverless-ed035a.kb.us-central1.gcp.elastic.cloud/app/dev_tools';

type FlyoutMode = 'create' | 'edit';

interface FlyoutState {
  mode: FlyoutMode;
  remote?: EvalsRemoteSummary;
}

export const RemotesListPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { data, isLoading, error } = useRemotes();
  const createRemote = useCreateRemote();
  const updateRemote = useUpdateRemote();
  const deleteRemote = useDeleteRemote();
  const testConnection = useTestRemoteConnection();

  const [flyout, setFlyout] = useState<FlyoutState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EvalsRemoteSummary | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);

  const apiKeyHelpSteps = useMemo(
    () => [
      {
        title: i18n.API_KEY_HELP_STEP1,
        children: (
          <EuiText size="s">
            <EuiLink href={GOLDEN_CLUSTER_DEV_TOOLS_URL} target="_blank" external>
              {GOLDEN_CLUSTER_DEV_TOOLS_URL}
            </EuiLink>
          </EuiText>
        ),
      },
      {
        title: i18n.API_KEY_HELP_STEP2,
        children: (
          <EuiCodeBlock language="json" fontSize="s" paddingSize="m" isCopyable>
            {DEV_TOOLS_COMMAND}
          </EuiCodeBlock>
        ),
      },
      {
        title: i18n.API_KEY_HELP_STEP3,
        children: <></>,
      },
    ],
    []
  );

  const openCreate = () => {
    setDisplayName('');
    setUrl('');
    setApiKey('');
    setFormError(null);
    setTestResult(null);
    setFlyout({ mode: 'create' });
  };

  const openEdit = (remote: EvalsRemoteSummary) => {
    setDisplayName(remote.displayName);
    setUrl(remote.url);
    setApiKey('');
    setFormError(null);
    setTestResult(null);
    setFlyout({ mode: 'edit', remote });
  };

  const closeFlyout = () => {
    setFlyout(null);
    setFormError(null);
    setTestResult(null);
  };

  const canTest =
    flyout?.mode === 'edit' && flyout.remote
      ? Boolean(url.trim())
      : Boolean(url.trim() && apiKey.trim());

  const onTestConnection = async () => {
    setTestResult(null);
    try {
      const body: { url?: string; apiKey?: string; remoteId?: string } = {};

      if (flyout?.mode === 'edit' && flyout.remote) {
        body.remoteId = flyout.remote.id;
        if (url.trim()) body.url = url.trim();
        if (apiKey.trim()) body.apiKey = apiKey.trim();
      } else {
        body.url = url.trim();
        body.apiKey = apiKey.trim();
      }

      const result = await testConnection.mutateAsync(body);
      setTestResult(result);
    } catch (e) {
      setTestResult({
        success: false,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const onSave = async () => {
    setFormError(null);

    if (!displayName.trim()) {
      setFormError(i18n.DISPLAY_NAME_REQUIRED);
      return;
    }
    if (!url.trim()) {
      setFormError(i18n.URL_REQUIRED);
      return;
    }

    try {
      if (flyout?.mode === 'create') {
        if (!apiKey.trim()) {
          setFormError(i18n.API_KEY_REQUIRED);
          return;
        }
        await createRemote.mutateAsync({
          displayName: displayName.trim(),
          url: url.trim(),
          apiKey: apiKey.trim(),
        });
        closeFlyout();
        return;
      }

      if (flyout?.mode === 'edit' && flyout.remote) {
        const updates: { displayName?: string; url?: string; apiKey?: string } = {
          displayName: displayName.trim(),
          url: url.trim(),
        };
        if (apiKey.trim()) {
          updates.apiKey = apiKey.trim();
        }
        await updateRemote.mutateAsync({ remoteId: flyout.remote.id, updates });
        closeFlyout();
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  };

  const isSaving = createRemote.isLoading || updateRemote.isLoading;

  const columns: Array<EuiBasicTableColumn<EvalsRemoteSummary>> = [
    { field: 'displayName', name: i18n.COLUMN_NAME },
    { field: 'url', name: i18n.COLUMN_URL },
    {
      name: i18n.COLUMN_ACTIONS,
      width: '120px',
      actions: [
        {
          name: i18n.EDIT_BUTTON,
          description: i18n.EDIT_BUTTON,
          icon: 'pencil',
          type: 'icon',
          onClick: (item) => openEdit(item),
        },
        {
          name: i18n.DELETE_BUTTON,
          description: i18n.DELETE_BUTTON,
          icon: 'trash',
          color: 'danger',
          type: 'icon',
          onClick: (item) => setConfirmDelete(item),
        },
      ],
    },
  ];

  const items = data?.remotes ?? [];

  return (
    <>
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={openCreate} fill iconType="plusInCircle">
              {i18n.CREATE_REMOTE_BUTTON}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {error ? (
          <>
            <EuiCallOut title={i18n.LOAD_ERROR_TITLE} color="danger" iconType="error" size="s">
              <p>{error instanceof Error ? error.message : String(error)}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}

        <EuiBasicTable<EvalsRemoteSummary>
          items={items}
          columns={columns}
          loading={isLoading}
          rowHeader="displayName"
        />
      </EuiPageSection>

      {flyout ? (
        <EuiFlyout onClose={closeFlyout} size="m" ownFocus={false}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                {flyout.mode === 'create' ? i18n.CREATE_FLYOUT_TITLE : i18n.EDIT_FLYOUT_TITLE}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {formError ? (
              <EuiCallOut title={i18n.FORM_ERROR_TITLE} color="danger" iconType="error" size="s">
                <p>{formError}</p>
              </EuiCallOut>
            ) : null}

            <EuiForm component="form">
              <EuiFormRow label={i18n.FIELD_DISPLAY_NAME_LABEL} fullWidth>
                <EuiFieldText
                  fullWidth
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </EuiFormRow>
              <EuiFormRow label={i18n.FIELD_URL_LABEL} helpText={i18n.FIELD_URL_HELP} fullWidth>
                <EuiFieldText fullWidth value={url} onChange={(e) => setUrl(e.target.value)} />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.FIELD_API_KEY_LABEL}
                helpText={flyout.mode === 'edit' ? i18n.FIELD_API_KEY_EDIT_HELP : undefined}
                fullWidth
              >
                <EuiFieldPassword
                  fullWidth
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={flyout.mode === 'edit' ? i18n.API_KEY_PLACEHOLDER : undefined}
                />
              </EuiFormRow>

              <EuiSpacer size="m" />

              <EuiAccordion
                id="apiKeyHelpAccordion"
                buttonContent={i18n.API_KEY_HELP_ACCORDION_TITLE}
                paddingSize="s"
              >
                <EuiSteps titleSize="xxs" steps={apiKeyHelpSteps} headingElement="h4" />
              </EuiAccordion>

              <EuiSpacer size="m" />

              <EuiFlexGroup gutterSize="m" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    iconType="check"
                    onClick={onTestConnection}
                    isLoading={testConnection.isLoading}
                    disabled={!canTest}
                  >
                    {i18n.TEST_CONNECTION_BUTTON}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>

              {testResult ? (
                <>
                  <EuiSpacer size="s" />
                  <EuiCallOut
                    title={
                      testResult.success
                        ? i18n.TEST_CONNECTION_SUCCESS
                        : i18n.TEST_CONNECTION_FAILURE
                    }
                    color={testResult.success ? 'success' : 'danger'}
                    iconType={testResult.success ? 'check' : 'error'}
                    size="s"
                  >
                    {testResult.message && !testResult.success ? <p>{testResult.message}</p> : null}
                  </EuiCallOut>
                </>
              ) : null}
            </EuiForm>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={closeFlyout} disabled={isSaving}>
                  {i18n.CANCEL_BUTTON}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={onSave} fill isLoading={isSaving} disabled={isSaving}>
                  {i18n.SAVE_BUTTON}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      ) : null}

      {confirmDelete ? (
        <EuiConfirmModal
          title={i18n.DELETE_CONFIRM_TITLE}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            await deleteRemote.mutateAsync(confirmDelete.id);
            setConfirmDelete(null);
          }}
          cancelButtonText={i18n.CANCEL_BUTTON}
          confirmButtonText={i18n.DELETE_BUTTON}
          buttonColor="danger"
          isLoading={deleteRemote.isLoading}
          defaultFocusedButton="confirm"
        >
          <p>{i18n.DELETE_CONFIRM_MESSAGE}</p>
        </EuiConfirmModal>
      ) : null}
    </>
  );
};
