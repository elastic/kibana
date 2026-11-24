/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import {
  SECRET_DESCRIPTION_MAX_LENGTH,
  SECRET_NAME_MAX_LENGTH,
  SECRET_PROVIDER_TYPE,
} from '@kbn/secrets';
import type { SecretConnector, SecretMetadata } from '@kbn/secrets';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { getSecretsErrorMessage } from './api';
import type { SecretsApi } from './api';
import { buildCreateSecretParams, buildUpdateSecretParams } from './secret_form';
import { ConnectorSourceFields, KibanaSourceFields } from './secret_source_fields';
import { useCreateSecret, useUpdateSecret } from './use_secret_mutations';
import { useSecretForm } from './use_secret_form';

const PROVIDERS = [SECRET_PROVIDER_TYPE.kibana, SECRET_PROVIDER_TYPE.connector] as const;

interface SecretFlyoutProps {
  api: SecretsApi;
  notifications: NotificationsStart;
  /** How the consumer refers to a secret by its name. */
  getSecretReference: (name: string) => string;
  /** The secret to edit. Without it, the flyout creates a secret. */
  secret?: SecretMetadata;
  /** The names that are taken, to catch a duplicate before the request. */
  existingNames: readonly string[];
  /** The connectors that can hold secrets and that the user may access. */
  connectors: readonly SecretConnector[];
  isLoadingConnectors: boolean;
  onClose: () => void;
}

/** Creates a secret, or edits an existing one. */
export const SecretFlyout = ({
  api,
  notifications,
  getSecretReference,
  secret,
  existingNames,
  connectors,
  isLoadingConnectors,
  onClose,
}: SecretFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'secretFlyoutTitle' });
  const providerGroupId = useGeneratedHtmlId({ prefix: 'secretProvider' });

  const form = useSecretForm({ secret, existingNames });
  const { isEditing, values, errors, setValue, markTouched, isInvalid } = form;

  const createSecret = useCreateSecret({ api, notifications });
  const updateSecret = useUpdateSecret({ api, notifications });
  const saveSecret = isEditing ? updateSecret : createSecret;

  const save = () => {
    if (!form.hasChanges || !form.validate()) {
      return;
    }
    if (secret) {
      updateSecret.mutate(buildUpdateSecretParams({ values, secret }), { onSuccess: onClose });
    } else {
      createSecret.mutate(buildCreateSecretParams(values), { onSuccess: onClose });
    }
  };

  const hasNoConnectors = connectors.length === 0 && !isLoadingConnectors;

  const providerOptions = [
    {
      id: SECRET_PROVIDER_TYPE.kibana,
      label: i18n.translate('xpack.secretsUi.flyout.providerKibana', {
        defaultMessage: 'Kibana',
      }),
      'data-test-subj': 'secretProviderKibana',
    },
    {
      id: SECRET_PROVIDER_TYPE.connector,
      label: i18n.translate('xpack.secretsUi.flyout.providerConnector', {
        defaultMessage: 'Connector',
      }),
      isDisabled: hasNoConnectors,
      toolTipContent: hasNoConnectors
        ? i18n.translate('xpack.secretsUi.flyout.noConnectorsTooltip', {
            defaultMessage:
              'There is no connector that can hold secrets, or you do not have access to one.',
          })
        : undefined,
      'data-test-subj': 'secretProviderConnector',
    },
  ];

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby={titleId} data-test-subj="secretFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {isEditing
              ? i18n.translate('xpack.secretsUi.flyout.editTitle', {
                  defaultMessage: 'Edit secret',
                })
              : i18n.translate('xpack.secretsUi.flyout.createTitle', {
                  defaultMessage: 'Create secret',
                })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <EuiFormRow
            label={i18n.translate('xpack.secretsUi.flyout.nameLabel', {
              defaultMessage: 'Name',
            })}
            helpText={
              isEditing
                ? i18n.translate('xpack.secretsUi.flyout.nameImmutableHelp', {
                    defaultMessage: 'The name cannot change, because it is how the secret is used.',
                  })
                : i18n.translate('xpack.secretsUi.flyout.nameHelp', {
                    defaultMessage: 'Use it as {reference}',
                    values: { reference: getSecretReference(values.name || 'name') },
                  })
            }
            isInvalid={isInvalid('name')}
            error={errors.name}
            fullWidth
          >
            <EuiFieldText
              value={values.name}
              maxLength={SECRET_NAME_MAX_LENGTH}
              disabled={isEditing}
              isInvalid={isInvalid('name')}
              onChange={(event) => setValue('name', event.target.value)}
              onBlur={() => markTouched('name')}
              fullWidth
              data-test-subj="secretNameInput"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.secretsUi.flyout.descriptionLabel', {
              defaultMessage: 'Description',
            })}
            labelAppend={
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.secretsUi.flyout.optional', {
                  defaultMessage: 'Optional',
                })}
              </EuiText>
            }
            fullWidth
          >
            <EuiTextArea
              value={values.description}
              maxLength={SECRET_DESCRIPTION_MAX_LENGTH}
              rows={2}
              onChange={(event) => setValue('description', event.target.value)}
              fullWidth
              data-test-subj="secretDescriptionInput"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.secretsUi.flyout.providerLabel', {
              defaultMessage: 'Source',
            })}
            fullWidth
          >
            <EuiButtonGroup
              legend={i18n.translate('xpack.secretsUi.flyout.providerLegend', {
                defaultMessage: 'Where the value comes from',
              })}
              name={providerGroupId}
              options={providerOptions}
              idSelected={values.provider}
              onChange={(id) => {
                const provider = PROVIDERS.find((candidate) => candidate === id);
                if (provider) {
                  setValue('provider', provider);
                }
              }}
              buttonSize="compressed"
              isFullWidth
              data-test-subj="secretProvider"
            />
          </EuiFormRow>

          {values.provider === SECRET_PROVIDER_TYPE.kibana ? (
            <KibanaSourceFields form={form} />
          ) : (
            <ConnectorSourceFields
              form={form}
              connectors={connectors}
              isLoadingConnectors={isLoadingConnectors}
            />
          )}

          {saveSecret.error ? (
            <>
              <EuiSpacer size="m" />
              <KbnDangerCallout
                announceOnMount
                title={i18n.translate('xpack.secretsUi.flyout.saveError', {
                  defaultMessage: 'The secret was not saved',
                })}
                data-test-subj="secretSaveError"
              >
                {getSecretsErrorMessage(saveSecret.error)}
              </KbnDangerCallout>
            </>
          ) : null}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="secretCancelButton">
              {i18n.translate('xpack.secretsUi.flyout.cancel', { defaultMessage: 'Cancel' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={save}
              isLoading={saveSecret.isLoading}
              isDisabled={!form.hasChanges}
              data-test-subj="secretSaveButton"
            >
              {isEditing
                ? i18n.translate('xpack.secretsUi.flyout.saveButton', {
                    defaultMessage: 'Save changes',
                  })
                : i18n.translate('xpack.secretsUi.flyout.createButton', {
                    defaultMessage: 'Create secret',
                  })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
