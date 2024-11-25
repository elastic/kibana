/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExclusiveUnion } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckableCard,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  htmlIdGenerator,
  useEuiTheme,
} from '@elastic/eui';
import { Form, FormikProvider, useFormik } from 'formik';
import moment from 'moment-timezone';
import type { FunctionComponent } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';

import { CodeEditorField } from '@kbn/code-editor';
import type { AuthenticatedUser, CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import { useDarkMode, useKibana } from '@kbn/kibana-react-plugin/public';
import type { KibanaServerError } from '@kbn/kibana-utils-plugin/public';
import { FormField, FormRow } from '@kbn/security-form-components';
import type {
  ApiKeyRoleDescriptors,
  CategorizedApiKey,
  Role,
} from '@kbn/security-plugin-types-common';

import { ApiKeyBadge, ApiKeyStatus, TimeToolTip } from '.';
import { APIKeysAPIClient } from './api_keys_api_client';
import type {
  CreateAPIKeyParams,
  CreateAPIKeyResult,
  UpdateAPIKeyParams,
  UpdateAPIKeyResult,
} from './api_keys_api_client';
import { DocLink } from './doc_link';

const TypeLabel = () => (
  <FormattedMessage
    id="xpack.security.accountManagement.apiKeyFlyout.typeLabel"
    defaultMessage="Type"
  />
);

const NameLabel = () => (
  <FormattedMessage
    id="xpack.security.accountManagement.apiKeyFlyout.nameLabel"
    defaultMessage="Name"
  />
);

const invalidJsonError = i18n.translate(
  'xpack.security.management.apiKeys.apiKeyFlyout.invalidJsonError',
  {
    defaultMessage: 'Enter valid JSON.',
  }
);

export interface ApiKeyFormValues {
  name: string;
  type: string;
  expiration: string;
  customExpiration: boolean;
  customPrivileges: boolean;
  includeMetadata: boolean;
  access: string;
  role_descriptors: string;
  metadata: string;
}

interface CommonApiKeyFlyoutProps {
  initialValues?: ApiKeyFormValues;
  onCancel(): void;
  canManageCrossClusterApiKeys?: boolean;
  readOnly?: boolean;
  http?: CoreStart['http'];
  currentUser?: AuthenticatedUser;
  isLoadingCurrentUser?: boolean;
  defaultName?: string;
  defaultMetadata?: string;
  defaultRoleDescriptors?: string;
  defaultExpiration?: string;
}

interface CreateApiKeyFlyoutProps extends CommonApiKeyFlyoutProps {
  onSuccess?: (createApiKeyResponse: CreateAPIKeyResult) => void;
}

interface UpdateApiKeyFlyoutProps extends CommonApiKeyFlyoutProps {
  onSuccess?: (updateApiKeyResponse: UpdateAPIKeyResult) => void;
  apiKey: CategorizedApiKey;
}

export type ApiKeyFlyoutProps = ExclusiveUnion<CreateApiKeyFlyoutProps, UpdateApiKeyFlyoutProps>;

const defaultInitialValues: ApiKeyFormValues = {
  name: '',
  type: 'rest',
  expiration: '',
  includeMetadata: false,
  metadata: '{}',
  customExpiration: false,
  customPrivileges: false,
  access: JSON.stringify(
    {
      search: [
        {
          names: ['*'],
        },
      ],
      replication: [
        {
          names: ['*'],
        },
      ],
    },
    null,
    2
  ),
  role_descriptors: '{}',
};

const READ_ONLY_BOILERPLATE = `{
  "read-only-role": {
    "cluster": [],
    "indices": [
      {
        "names": ["*"],
        "privileges": ["read"]
      }
    ]
  }
}`;
const WRITE_ONLY_BOILERPLATE = `{
  "write-only-role": {
    "cluster": [],
    "indices": [
      {
        "names": ["*"],
        "privileges": ["write"]
      }
    ]
  }
}`;

const httpErrorText = i18n.translate('xpack.security.httpError', {
  defaultMessage: 'Could not initialize http client.',
});

export const ApiKeyFlyout: FunctionComponent<ApiKeyFlyoutProps> = ({
  onSuccess,
  onCancel,
  defaultExpiration,
  defaultMetadata,
  defaultRoleDescriptors,
  defaultName,
  apiKey,
  canManageCrossClusterApiKeys = false,
  readOnly = false,
  currentUser,
  isLoadingCurrentUser,
}) => {
  const { euiTheme } = useEuiTheme();
  const isDarkMode = useDarkMode();
  const {
    services: { http },
  } = useKibana();
  const [responseError, setResponseError] = useState<KibanaServerError | undefined>(undefined);
  const [{ value: roles, loading: isLoadingRoles }, getRoles] = useAsyncFn(() => {
    if (http) {
      return http.get<Role[]>('/api/security/role');
    }
    return Promise.resolve([]);
  }, [http]);

  const formik = useFormik<ApiKeyFormValues>({
    onSubmit: async (values) => {
      if (http) {
        try {
          if (apiKey) {
            const updateApiKeyResponse = await new APIKeysAPIClient(http).updateApiKey(
              mapUpdateApiKeyValues(apiKey.type, apiKey.id, values)
            );

            onSuccess?.(updateApiKeyResponse);
          } else {
            const createApiKeyResponse = await new APIKeysAPIClient(http).createApiKey(
              mapCreateApiKeyValues(values)
            );

            onSuccess?.(createApiKeyResponse);
          }
          setResponseError(undefined);
        } catch (error) {
          setResponseError(error.body);
          throw error;
        }
      } else {
        setResponseError({ message: httpErrorText, statusCode: 0 });
        throw new Error(httpErrorText);
      }
    },
    initialValues: apiKey ? mapApiKeyFormValues(apiKey) : defaultInitialValues,
  });

  useEffect(() => {
    getRoles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentUser && roles) {
      const userPermissions = currentUser.roles.reduce<ApiKeyRoleDescriptors>(
        (accumulator, roleName) => {
          const role = roles.find((r) => r.name === roleName);
          if (role) {
            accumulator[role.name] = role.elasticsearch;
          }
          return accumulator;
        },
        {}
      );

      if (!formik.touched.role_descriptors && !apiKey) {
        formik.setFieldValue('role_descriptors', JSON.stringify(userPermissions, null, 2));
      }
    }
  }, [currentUser, roles]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (defaultRoleDescriptors && !apiKey) {
      formik.setFieldValue('role_descriptors', defaultRoleDescriptors);
    }
  }, [defaultRoleDescriptors]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (defaultName && !apiKey) {
      formik.setFieldValue('name', defaultName);
    }
  }, [defaultName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (defaultMetadata && !apiKey) {
      formik.setFieldValue('metadata', defaultMetadata);
    }
  }, [defaultMetadata]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (defaultExpiration && !apiKey) {
      formik.setFieldValue('expiration', defaultExpiration);
      formik.setFieldValue('customExpiration', true);
    }
  }, [defaultExpiration]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = isLoadingCurrentUser || isLoadingRoles;

  const isOwner = currentUser && apiKey ? currentUser.username === apiKey.username : false;
  const hasExpired = apiKey ? apiKey.expiration && moment(apiKey.expiration).isBefore() : false;
  const canEdit = isOwner && !hasExpired;

  // autofocus first field when loaded
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (inputRef?.current) {
      inputRef?.current.focus();
    }
  }, [isLoading]);

  const titleId = htmlIdGenerator('formFlyout')('title');
  const isSubmitButtonHidden = readOnly || (apiKey && !canEdit);

  const isSubmitDisabled =
    isLoading || (formik.submitCount > 0 && !formik.isValid) || readOnly || (apiKey && !canEdit);

  const title = apiKey
    ? readOnly || !canEdit
      ? i18n.translate('xpack.security.accountManagement.apiKeyFlyout.viewTitle', {
          defaultMessage: `API key details`,
        })
      : i18n.translate('xpack.security.accountManagement.apiKeyFlyout.updateTitle', {
          defaultMessage: `Update API key`,
        })
    : i18n.translate('xpack.security.accountManagement.apiKeyFlyout.createTitle', {
        defaultMessage: `Create API key`,
      });

  const submitButtonText = apiKey
    ? i18n.translate('xpack.security.accountManagement.apiKeyFlyout.updateSubmitButton', {
        defaultMessage: `{isSubmitting, select, true{Updating API key…} other{Update API key}}`,
        values: { isSubmitting: formik.isSubmitting },
      })
    : i18n.translate('xpack.security.accountManagement.apiKeyFlyout.createSubmitButton', {
        defaultMessage: `{isSubmitting, select, true{Creating API key…} other{Create API key}}`,
        values: { isSubmitting: formik.isSubmitting },
      });

  let expirationDate: Date | undefined;
  if (formik.values.customExpiration) {
    expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + parseInt(formik.values.expiration, 10));
  }

  return (
    <FormikProvider value={formik}>
      <EuiFlyout onClose={onCancel} aria-labelledby={titleId} size="m" ownFocus>
        <Form
          onSubmit={formik.handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={titleId}>{title}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiSkeletonText isLoading={isLoading}>
              {responseError && (
                <>
                  <EuiCallOut
                    data-test-subj="apiKeyFlyoutResponseError"
                    color="danger"
                    title={
                      <FormattedMessage
                        id="xpack.security.accountManagement.apiKeyFlyout.responseErrorTitle"
                        defaultMessage="Error creating API key"
                      />
                    }
                  >
                    {responseError.message}
                  </EuiCallOut>
                  <EuiSpacer />
                </>
              )}
              {apiKey && !readOnly ? (
                !isOwner ? (
                  <>
                    <EuiCallOut
                      iconType="lock"
                      title={
                        <FormattedMessage
                          id="xpack.security.accountManagement.apiKeyFlyout.readonlyOwnedByOtherUserWarning"
                          defaultMessage="You can’t update this API key. It belongs to another user."
                        />
                      }
                    />
                    <EuiSpacer />
                  </>
                ) : hasExpired ? (
                  <>
                    <EuiCallOut
                      iconType="lock"
                      title={
                        <FormattedMessage
                          id="xpack.security.accountManagement.apiKeyFlyout.readonlyExpiredWarning"
                          defaultMessage="This API key has expired. You can no longer update it."
                        />
                      }
                    />
                    <EuiSpacer />
                  </>
                ) : null
              ) : null}
              <EuiPanel hasBorder>
                {apiKey ? (
                  <>
                    <EuiTitle size="xs">
                      <h4>
                        <FormattedMessage
                          id="xpack.security.accountManagement.apiKeyFlyout.overviewLabel"
                          defaultMessage="Overview"
                        />
                      </h4>
                    </EuiTitle>
                    <EuiSpacer />
                    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                      <EuiFlexItem>
                        <EuiText size="xs">
                          <strong>
                            <NameLabel />
                          </strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>{apiKey.name}</EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiHorizontalRule margin="s" />
                    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                      <EuiFlexItem>
                        <EuiText size="xs">
                          <strong>
                            <FormattedMessage
                              id="xpack.security.accountManagement.apiKeyFlyout.ownerLabel"
                              defaultMessage="Owner"
                            />
                          </strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="xs">
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="user" />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>{apiKey.username}</EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiHorizontalRule margin="s" />

                    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                      <EuiFlexItem>
                        <EuiText size="xs">
                          <strong>
                            <TypeLabel />
                          </strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <ApiKeyBadge type={apiKey.type} />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiHorizontalRule margin="s" />

                    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                      <EuiFlexItem>
                        <EuiText size="xs">
                          <strong>
                            <FormattedMessage
                              id="xpack.security.accountManagement.apiKeyFlyout.createdLabel"
                              defaultMessage="Created"
                            />
                          </strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <TimeToolTip timestamp={apiKey.creation} />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiHorizontalRule margin="s" />

                    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                      <EuiFlexItem>
                        <EuiText size="xs">
                          <strong>
                            <FormattedMessage
                              id="xpack.security.accountManagement.apiKeyFlyout.statusLabel"
                              defaultMessage="Status"
                            />
                          </strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <ApiKeyStatus expiration={apiKey.expiration} />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </>
                ) : (
                  <>
                    <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="gear" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiTitle size="xs">
                          <h4>
                            <FormattedMessage
                              id="xpack.security.accountManagement.apiKeyFlyout.setup.title"
                              defaultMessage="Setup"
                            />
                          </h4>
                        </EuiTitle>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer size="xs" />
                    <EuiText color="subdued" size="xs">
                      <p>
                        <FormattedMessage
                          id="xpack.security.accountManagement.apiKeyFlyout.setup.description"
                          defaultMessage="Basic configuration details to create your API key."
                        />
                      </p>
                    </EuiText>
                    <EuiSpacer size="s" />
                    <FormRow label={<NameLabel />} fullWidth>
                      <FormField
                        name="name"
                        inputRef={inputRef}
                        data-test-subj="apiKeyNameInput"
                        disabled={readOnly || !!apiKey}
                        validate={{
                          required: i18n.translate(
                            'xpack.security.management.apiKeys.apiKeyFlyout.nameRequired',
                            {
                              defaultMessage: 'Enter a name.',
                            }
                          ),
                        }}
                        fullWidth
                      />
                    </FormRow>
                    {canManageCrossClusterApiKeys ? (
                      <FormRow name="type" label={<TypeLabel />} fullWidth>
                        <EuiFlexGroup gutterSize="m">
                          <EuiFlexItem>
                            <EuiCheckableCard
                              id="rest"
                              label={
                                <>
                                  <EuiTitle size="xxs">
                                    <h2>
                                      <FormattedMessage
                                        id="xpack.security.accountManagement.apiKeyFlyout.restTypeLabel"
                                        defaultMessage="User API key"
                                      />
                                    </h2>
                                  </EuiTitle>
                                  <EuiSpacer size="xs" />
                                  <EuiText size="s">
                                    <FormattedMessage
                                      id="xpack.security.accountManagement.apiKeyFlyout.restTypeDescription"
                                      defaultMessage="Allow external services to access the Elastic Stack on your behalf."
                                    />
                                  </EuiText>
                                </>
                              }
                              onChange={() => formik.setFieldValue('type', 'rest')}
                              checked={formik.values.type === 'rest'}
                            />
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <EuiCheckableCard
                              id="cross_cluster"
                              label={
                                <>
                                  <EuiTitle size="xxs">
                                    <h2>
                                      <FormattedMessage
                                        id="xpack.security.accountManagement.apiKeyFlyout.crossClusterTypeLabel"
                                        defaultMessage="Cross-cluster API key"
                                      />
                                    </h2>
                                  </EuiTitle>
                                  <EuiSpacer size="xs" />
                                  <EuiText size="s">
                                    <FormattedMessage
                                      id="xpack.security.accountManagement.apiKeyFlyout.crossClusterTypeDescription"
                                      defaultMessage="Allow other clusters to connect to this cluster."
                                    />
                                  </EuiText>
                                </>
                              }
                              onChange={() => formik.setFieldValue('type', 'cross_cluster')}
                              checked={formik.values.type === 'cross_cluster'}
                            />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </FormRow>
                    ) : (
                      <EuiFormRow label={<TypeLabel />}>
                        <ApiKeyBadge type="rest" />
                      </EuiFormRow>
                    )}
                  </>
                )}
              </EuiPanel>
              <EuiSpacer />
              {!apiKey && (
                <>
                  <EuiPanel hasBorder>
                    <div style={{ paddingRight: euiTheme.size.s }}>
                      <EuiSwitch
                        data-test-subj="apiKeyCustomExpirationSwitch"
                        label={
                          <EuiTitle size="xs">
                            <h4>
                              <FormattedMessage
                                id="xpack.security.accountManagement.apiKeyFlyout.applyExpirationDateLabel"
                                defaultMessage="Apply expiration date"
                              />
                            </h4>
                          </EuiTitle>
                        }
                        checked={Boolean(formik.values.customExpiration)}
                        disabled={readOnly || !!apiKey}
                        onChange={(e) => formik.setFieldValue('customExpiration', e.target.checked)}
                      />
                      <EuiSpacer size="xs" />
                      <EuiText color="subdued" size="xs">
                        <p>
                          <FormattedMessage
                            id="xpack.security.accountManagement.apiKeyFlyout.expiresFieldHelpText"
                            defaultMessage="Setting an expiration date is a security best practice. Defaults to no expiration."
                          />
                        </p>
                      </EuiText>
                    </div>
                    {formik.values.customExpiration && (
                      <>
                        <EuiSpacer />
                        <EuiFormRow
                          fullWidth
                          helpText={
                            <FormattedMessage
                              id="xpack.security.accountManagement.apiKeyFlyout.expirationHelpText"
                              defaultMessage="This API Key will expire on {expirationDate}"
                              values={{
                                expirationDate: (
                                  <strong>
                                    <FormattedDate
                                      year="numeric"
                                      month="long"
                                      day="numeric"
                                      value={expirationDate!}
                                    />
                                  </strong>
                                ),
                              }}
                            />
                          }
                        >
                          <FormField
                            as={EuiFieldNumber}
                            name="expiration"
                            min={0}
                            append={i18n.translate(
                              'xpack.security.accountManagement.apiKeyFlyout.expirationUnit',
                              {
                                defaultMessage: 'days',
                              }
                            )}
                            validate={{
                              min: {
                                value: 1,
                                message: i18n.translate(
                                  'xpack.security.management.apiKeys.apiKeyFlyout.expirationRequired',
                                  {
                                    defaultMessage:
                                      'Enter a valid duration or disable this option.',
                                  }
                                ),
                              },
                            }}
                            disabled={readOnly || !!apiKey}
                            data-test-subj="apiKeyCustomExpirationInput"
                          />
                        </EuiFormRow>
                      </>
                    )}
                  </EuiPanel>
                  <EuiSpacer size="l" />
                </>
              )}
              {formik.values.type === 'cross_cluster' ? (
                <EuiPanel hasBorder>
                  <div style={{ paddingRight: euiTheme.size.s }}>
                    <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="lock" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiTitle size="xs">
                          <h4>
                            {i18n.translate(
                              'xpack.security.accountManagement.apiKeyFlyout.accessPermissions.title',
                              {
                                defaultMessage: 'Access Permissions',
                              }
                            )}
                          </h4>
                        </EuiTitle>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>
                  <FormRow
                    data-test-subj="apiKeysAccessCodeEditor"
                    label={
                      <FormattedMessage
                        id="xpack.security.accountManagement.apiKeyFlyout.accessLabel"
                        defaultMessage="Access"
                      />
                    }
                    helpText={
                      <DocLink
                        app="elasticsearch"
                        doc="security-api-create-cross-cluster-api-key.html#security-api-create-cross-cluster-api-key-request-body"
                      >
                        <FormattedMessage
                          id="xpack.security.accountManagement.apiKeyFlyout.accessHelpText"
                          defaultMessage="Learn how to structure access permissions."
                        />
                      </DocLink>
                    }
                    fullWidth
                  >
                    <FormField
                      as={CodeEditorField}
                      name="access"
                      aria-label={i18n.translate(
                        'xpack.security.management.apiKeys.apiKeyFlyout.accessCodeEditor',
                        {
                          defaultMessage: 'Code editor for access permissions',
                        }
                      )}
                      value={formik.values.access}
                      options={{ readOnly: readOnly || (apiKey && !canEdit) }}
                      onChange={(value: string) => formik.setFieldValue('access', value)}
                      validate={(value: string) => {
                        if (!value) {
                          return i18n.translate(
                            'xpack.security.management.apiKeys.apiKeyFlyout.accessRequired',
                            {
                              defaultMessage: 'Enter access permissions or disable this option.',
                            }
                          );
                        }
                        try {
                          JSON.parse(value);
                        } catch (e) {
                          return invalidJsonError;
                        }
                      }}
                      fullWidth
                      languageId="xjson"
                      height={200}
                      useDarkTheme={isDarkMode}
                    />
                  </FormRow>
                </EuiPanel>
              ) : (
                <EuiPanel hasBorder>
                  <div style={{ paddingRight: euiTheme.size.s }}>
                    <EuiSwitch
                      label={
                        <EuiTitle size="xs">
                          <h4>
                            {i18n.translate(
                              'xpack.security.accountManagement.apiKeyFlyout.privileges.title',
                              {
                                defaultMessage: 'Control security privileges',
                              }
                            )}
                          </h4>
                        </EuiTitle>
                      }
                      checked={formik.values.customPrivileges}
                      data-test-subj="apiKeysRoleDescriptorsSwitch"
                      onChange={(e) => formik.setFieldValue('customPrivileges', e.target.checked)}
                      disabled={readOnly || (apiKey && !canEdit)}
                    />
                    <EuiSpacer size="xs" />
                    <EuiText color="subdued" size="xs">
                      <p>
                        {i18n.translate(
                          'xpack.security.accountManagement.apiKeyFlyout.privileges.description',
                          {
                            defaultMessage:
                              'Control access to specific Elasticsearch APIs and resources using predefined roles or custom privileges per API key.',
                          }
                        )}
                      </p>
                    </EuiText>
                  </div>
                  {formik.values.customPrivileges && (
                    <>
                      <EuiSpacer />
                      <EuiPanel hasShadow={false} color="subdued">
                        <EuiFlexGroup
                          gutterSize="none"
                          justifyContent="flexEnd"
                          alignItems="baseline"
                        >
                          <EuiFlexItem grow={false}>
                            <EuiText size="xs">
                              <h4>
                                {i18n.translate(
                                  'xpack.security.apiKey.privileges.boilerplate.label',
                                  {
                                    defaultMessage: 'Replace with boilerplate:',
                                  }
                                )}
                              </h4>
                            </EuiText>
                          </EuiFlexItem>

                          <EuiFlexItem grow={false}>
                            <EuiButtonEmpty
                              data-test-subj="apiKeysReadOnlyDescriptors"
                              onClick={() =>
                                formik.setFieldValue('role_descriptors', READ_ONLY_BOILERPLATE)
                              }
                            >
                              {i18n.translate(
                                'xpack.security.apiKeys.apiKeyFlyout.roleDescriptors.readOnlyLabel',
                                {
                                  defaultMessage: 'Read-only',
                                }
                              )}
                            </EuiButtonEmpty>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiButtonEmpty
                              data-test-subj="apiKeysWriteOnlyDescriptors"
                              onClick={() =>
                                formik.setFieldValue('role_descriptors', WRITE_ONLY_BOILERPLATE)
                              }
                            >
                              {i18n.translate(
                                'xpack.security.management.apiKeys.apiKeyFlyout.roleDescriptors.writeOnlyLabel',
                                {
                                  defaultMessage: 'Write-only',
                                }
                              )}
                            </EuiButtonEmpty>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiPanel>
                      <FormRow
                        helpText={
                          <DocLink
                            app="elasticsearch"
                            doc="security-api-create-api-key.html#security-api-create-api-key-request-body"
                          >
                            <FormattedMessage
                              id="xpack.security.accountManagement.apiKeyFlyout.roleDescriptorsHelpText"
                              defaultMessage="Learn how to structure role descriptors."
                            />
                          </DocLink>
                        }
                        fullWidth
                        data-test-subj="apiKeysRoleDescriptorsCodeEditor"
                      >
                        <FormField
                          as={CodeEditorField}
                          name="role_descriptors"
                          aria-label={i18n.translate(
                            'xpack.security.management.apiKeys.apiKeyFlyout.roleDescriptorsCodeEditor',
                            {
                              defaultMessage: 'Code editor for role descriptors of this API key',
                            }
                          )}
                          value={formik.values.role_descriptors}
                          options={{ readOnly: readOnly || (apiKey && !canEdit) }}
                          onChange={(value: string) =>
                            formik.setFieldValue('role_descriptors', value)
                          }
                          validate={(value: string) => {
                            if (!value) {
                              return i18n.translate(
                                'xpack.security.management.apiKeys.apiKeyFlyout.roleDescriptorsRequired',
                                {
                                  defaultMessage: 'Enter role descriptors or disable this option.',
                                }
                              );
                            }
                            try {
                              JSON.parse(value);
                            } catch (e) {
                              return invalidJsonError;
                            }
                          }}
                          fullWidth
                          languageId="xjson"
                          height={200}
                          useDarkTheme={isDarkMode}
                        />
                      </FormRow>
                    </>
                  )}
                </EuiPanel>
              )}
              <EuiSpacer size="l" />
              <EuiPanel hasBorder>
                <div style={{ paddingRight: euiTheme.size.s }}>
                  <EuiSwitch
                    label={
                      <EuiTitle size="xs">
                        <h4>
                          <FormattedMessage
                            id="xpack.security.accountManagement.apiKeyFlyout.metadata.title"
                            defaultMessage="Add metadata"
                          />
                        </h4>
                      </EuiTitle>
                    }
                    data-test-subj="apiKeysMetadataSwitch"
                    checked={formik.values.includeMetadata}
                    disabled={readOnly || (apiKey && !canEdit)}
                    onChange={(e) => formik.setFieldValue('includeMetadata', e.target.checked)}
                  />
                  <EuiSpacer size="xs" />
                  <EuiText color="subdued" size="xs">
                    <p>
                      <FormattedMessage
                        id="xpack.security.accountManagement.apiKeyFlyout.metadata.description"
                        defaultMessage="Use configurable key-value pairs to add information about the API key or customize Elasticsearch resource access."
                      />
                    </p>
                  </EuiText>
                </div>
                {formik.values.includeMetadata && (
                  <>
                    <EuiSpacer />
                    <FormRow
                      data-test-subj="apiKeysMetadataCodeEditor"
                      helpText={
                        <DocLink
                          app="elasticsearch"
                          doc="security-api-create-api-key.html#security-api-create-api-key-request-body"
                        >
                          <FormattedMessage
                            id="xpack.security.accountManagement.apiKeyFlyout.metadataHelpText"
                            defaultMessage="Learn how to structure metadata."
                          />
                        </DocLink>
                      }
                      fullWidth
                    >
                      <FormField
                        as={CodeEditorField}
                        name="metadata"
                        aria-label={i18n.translate(
                          'xpack.security.management.apiKeys.apiKeyFlyout.metadataCodeEditor',
                          {
                            defaultMessage:
                              'Code editor for arbitrary metadata associated with the API key',
                          }
                        )}
                        options={{ readOnly: readOnly || (apiKey && !canEdit) }}
                        value={formik.values.metadata}
                        onChange={(value: string) => formik.setFieldValue('metadata', value)}
                        validate={(value: string) => {
                          if (!value) {
                            return i18n.translate(
                              'xpack.security.management.apiKeys.apiKeyFlyout.metadataRequired',
                              {
                                defaultMessage: 'Enter metadata or disable this option.',
                              }
                            );
                          }
                          try {
                            JSON.parse(value);
                          } catch (e) {
                            return invalidJsonError;
                          }
                        }}
                        fullWidth
                        languageId="xjson"
                        height={200}
                        useDarkTheme={isDarkMode}
                      />
                    </FormRow>
                  </>
                )}
              </EuiPanel>
            </EuiSkeletonText>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="formFlyoutCancelButton"
                  flush="right"
                  isDisabled={isLoading}
                  onClick={onCancel}
                >
                  <FormattedMessage
                    id="xpack.security.formFlyout.cancelButton"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              {!isSubmitButtonHidden && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="formFlyoutSubmitButton"
                    isLoading={formik.isSubmitting}
                    isDisabled={isSubmitDisabled}
                    fill
                    type="submit"
                  >
                    {submitButtonText}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </Form>
      </EuiFlyout>
    </FormikProvider>
  );
};

export function mapCreateApiKeyValues(values: ApiKeyFormValues): CreateAPIKeyParams {
  const { type, name } = values;
  const expiration = values.customExpiration ? `${values.expiration}d` : undefined;
  const metadata = values.includeMetadata ? JSON.parse(values.metadata) : '{}';

  if (type === 'cross_cluster') {
    return {
      type,
      name,
      expiration,
      metadata,
      access: JSON.parse(values.access),
    };
  }

  return {
    name,
    expiration,
    metadata,
    role_descriptors: values.customPrivileges ? JSON.parse(values.role_descriptors) : '{}',
  };
}

export function mapUpdateApiKeyValues(
  type: CategorizedApiKey['type'],
  id: string,
  values: ApiKeyFormValues
): UpdateAPIKeyParams {
  const metadata = values.includeMetadata ? JSON.parse(values.metadata) : '{}';

  if (type === 'cross_cluster') {
    return {
      type,
      id,
      metadata,
      access: JSON.parse(values.access),
    };
  }

  return {
    id,
    metadata,
    role_descriptors: values.customPrivileges ? JSON.parse(values.role_descriptors) : '{}',
  };
}

/**
 * Maps data from the selected API key to pre-populate the form
 */
function mapApiKeyFormValues(apiKey: CategorizedApiKey): ApiKeyFormValues {
  const includeMetadata = Object.keys(apiKey.metadata).length > 0;
  const customPrivileges =
    apiKey.type !== 'cross_cluster' ? Object.keys(apiKey.role_descriptors).length > 0 : false;

  return {
    name: apiKey.name,
    type: apiKey.type,
    customExpiration: !!apiKey.expiration,
    expiration: !!apiKey.expiration ? apiKey.expiration.toString() : '',
    includeMetadata,
    metadata: includeMetadata ? JSON.stringify(apiKey.metadata, null, 2) : '{}',
    customPrivileges,
    role_descriptors: customPrivileges
      ? JSON.stringify(apiKey.type !== 'cross_cluster' && apiKey.role_descriptors, null, 2)
      : '{}',
    access: apiKey.type === 'cross_cluster' ? JSON.stringify(apiKey.access, null, 2) : '{}',
  };
}
