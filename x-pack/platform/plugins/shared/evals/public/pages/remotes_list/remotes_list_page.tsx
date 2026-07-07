/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
  useGeneratedHtmlId,
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
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';
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

const ALLOWED_CLOUD_SUFFIXES = ['.cloud.es.io', '.elastic.cloud'] as const;

const getUrlValidationError = (value: string): string | null => {
  if (!value) return null;
  if (!/^https:\/\//i.test(value)) {
    return i18n.URL_SCHEME_REQUIRED;
  }

  try {
    const url = new URL(value);

    const hostname = url.hostname.toLowerCase();
    if (!ALLOWED_CLOUD_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
      return i18n.URL_HOST_REQUIRED;
    }

    return null;
  } catch {
    return i18n.URL_INVALID;
  }
};

export const RemotesListPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { canManage } = useEvalsPermissions();
  const deleteModalTitleId = useGeneratedHtmlId();
  const flyoutTitleId = useGeneratedHtmlId();
  const { data, isLoading, error } = useRemotes();
  const createRemote = useCreateRemote();
  const updateRemote = useUpdateRemote();
  const deleteRemote = useDeleteRemote();
  const testConnection = useTestRemoteConnection();

  const [actionError, setActionError] = useState<string | null>(null);
  const [flyout, setFlyout] = useState<FlyoutState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EvalsRemoteSummary | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    displayName?: string;
    url?: string;
    apiKey?: string;
  }>({});
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
    setFieldErrors({});
    setActionError(null);
    setFormError(null);
    setTestResult(null);
    setFlyout({ mode: 'create' });
  };

  const openEdit = useCallback((remote: EvalsRemoteSummary) => {
    setDisplayName(remote.displayName);
    setUrl(remote.url);
    setApiKey('');
    setFieldErrors({});
    setActionError(null);
    setFormError(null);
    setTestResult(null);
    setFlyout({ mode: 'edit', remote });
  }, []);

  const closeFlyout = () => {
    setFlyout(null);
    setFieldErrors({});
    setFormError(null);
    setTestResult(null);
  };

  const urlValidationError = useMemo(() => getUrlValidationError(url.trim()), [url]);

  const canTest =
    flyout?.mode === 'edit' && flyout.remote
      ? Boolean(url.trim() && !urlValidationError)
      : Boolean(url.trim() && apiKey.trim() && !urlValidationError);

  const onTestConnection = async () => {
    setTestResult(null);
    setFormError(null);
    setFieldErrors({});

    const errors: typeof fieldErrors = {};
    const trimmedUrl = url.trim();
    const trimmedApiKey = apiKey.trim();

    if (!trimmedUrl) {
      errors.url = i18n.URL_REQUIRED;
    } else if (urlValidationError) {
      errors.url = urlValidationError;
    }

    const requireApiKey = !(flyout?.mode === 'edit' && flyout.remote);
    if (requireApiKey && !trimmedApiKey) {
      errors.apiKey = i18n.API_KEY_REQUIRED;
    }

    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }

    try {
      const body: { url?: string; apiKey?: string; remoteId?: string } = {};

      if (flyout?.mode === 'edit' && flyout.remote) {
        body.remoteId = flyout.remote.id;
        if (trimmedUrl) body.url = trimmedUrl;
        if (trimmedApiKey) body.apiKey = trimmedApiKey;
      } else {
        body.url = trimmedUrl;
        body.apiKey = trimmedApiKey;
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
    setFieldErrors({});

    const errors: typeof fieldErrors = {};
    const trimmedDisplayName = displayName.trim();
    const trimmedUrl = url.trim();
    const trimmedApiKey = apiKey.trim();

    if (!trimmedDisplayName) errors.displayName = i18n.DISPLAY_NAME_REQUIRED;
    if (!trimmedUrl) {
      errors.url = i18n.URL_REQUIRED;
    } else if (urlValidationError) {
      errors.url = urlValidationError;
    }

    const requireApiKey = flyout?.mode === 'create';
    if (requireApiKey && !trimmedApiKey) errors.apiKey = i18n.API_KEY_REQUIRED;

    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }

    try {
      if (flyout?.mode === 'create') {
        await createRemote.mutateAsync({
          displayName: trimmedDisplayName,
          url: trimmedUrl,
          apiKey: trimmedApiKey,
        });
        closeFlyout();
        return;
      }

      if (flyout?.mode === 'edit' && flyout.remote) {
        const updates: { displayName?: string; url?: string; apiKey?: string } = {
          displayName: trimmedDisplayName,
          url: trimmedUrl,
        };
        if (trimmedApiKey) {
          updates.apiKey = trimmedApiKey;
        }
        await updateRemote.mutateAsync({ remoteId: flyout.remote.id, updates });
        closeFlyout();
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  };

  const isSaving = createRemote.isLoading || updateRemote.isLoading;

  const columns = useMemo<Array<EuiBasicTableColumn<EvalsRemoteSummary>>>(() => {
    const baseColumns: Array<EuiBasicTableColumn<EvalsRemoteSummary>> = [
      { field: 'displayName', name: i18n.COLUMN_NAME },
      { field: 'url', name: i18n.COLUMN_URL },
    ];

    if (canManage) {
      baseColumns.push({
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
      });
    }

    return baseColumns;
  }, [openEdit, canManage]);

  const items = data?.remotes ?? [];

  return (
    <>
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        {canManage ? (
          <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={openCreate} fill iconType="plusInCircle">
                {i18n.CREATE_REMOTE_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
        <EuiSpacer size="m" />
        {actionError ? (
          <>
            <EuiCallOut
              announceOnMount
              title={i18n.DELETE_ERROR_TITLE}
              color="danger"
              iconType="error"
              size="s"
              onDismiss={() => setActionError(null)}
            >
              <p>{actionError}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}
        {error ? (
          <>
            <EuiCallOut
              announceOnMount
              title={i18n.LOAD_ERROR_TITLE}
              color="danger"
              iconType="error"
              size="s"
            >
              <p>{error instanceof Error ? error.message : String(error)}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}

        <EuiBasicTable<EvalsRemoteSummary>
          tableCaption={i18n.REMOTES_TABLE_CAPTION}
          items={items}
          columns={columns}
          loading={isLoading}
          rowHeader="displayName"
        />
      </EuiPageSection>

      {flyout ? (
        <EuiFlyout onClose={closeFlyout} size="m" ownFocus={false} aria-labelledby={flyoutTitleId}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m" id={flyoutTitleId}>
              <h2>
                {flyout.mode === 'create' ? i18n.CREATE_FLYOUT_TITLE : i18n.EDIT_FLYOUT_TITLE}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {formError ? (
              <EuiCallOut
                announceOnMount
                title={i18n.FORM_ERROR_TITLE}
                color="danger"
                iconType="error"
                size="s"
              >
                <p>{formError}</p>
              </EuiCallOut>
            ) : null}

            <EuiForm component="form">
              <EuiFormRow
                label={i18n.FIELD_DISPLAY_NAME_LABEL}
                fullWidth
                isInvalid={Boolean(fieldErrors.displayName)}
                error={fieldErrors.displayName}
              >
                <EuiFieldText
                  fullWidth
                  value={displayName}
                  isInvalid={Boolean(fieldErrors.displayName)}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (fieldErrors.displayName) {
                      setFieldErrors((prev) => ({ ...prev, displayName: undefined }));
                    }
                  }}
                />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.FIELD_URL_LABEL}
                helpText={i18n.FIELD_URL_HELP}
                fullWidth
                isInvalid={Boolean(fieldErrors.url)}
                error={fieldErrors.url}
              >
                <EuiFieldText
                  fullWidth
                  value={url}
                  placeholder={i18n.FIELD_URL_PLACEHOLDER}
                  isInvalid={Boolean(fieldErrors.url)}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (fieldErrors.url) {
                      setFieldErrors((prev) => ({ ...prev, url: undefined }));
                    }
                  }}
                />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.FIELD_API_KEY_LABEL}
                helpText={flyout.mode === 'edit' ? i18n.FIELD_API_KEY_EDIT_HELP : undefined}
                fullWidth
                isInvalid={Boolean(fieldErrors.apiKey)}
                error={fieldErrors.apiKey}
              >
                <EuiFieldPassword
                  fullWidth
                  value={apiKey}
                  isInvalid={Boolean(fieldErrors.apiKey)}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    if (fieldErrors.apiKey) {
                      setFieldErrors((prev) => ({ ...prev, apiKey: undefined }));
                    }
                  }}
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
                    announceOnMount
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
          aria-labelledby={deleteModalTitleId}
          titleProps={{ id: deleteModalTitleId }}
          onCancel={() => {
            setConfirmDelete(null);
          }}
          onConfirm={async () => {
            setActionError(null);
            try {
              await deleteRemote.mutateAsync(confirmDelete.id);
            } catch (e) {
              setActionError(e instanceof Error ? e.message : String(e));
            } finally {
              setConfirmDelete(null);
            }
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
