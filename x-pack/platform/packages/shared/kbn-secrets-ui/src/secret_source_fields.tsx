/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldPassword, EuiFieldText, EuiFormRow, EuiSuperSelect, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { SecretConnector } from '@kbn/secrets';
import type { SecretForm } from './use_secret_form';

/** The value of a secret that is stored in Kibana. */
export const KibanaSourceFields = ({
  form: { isEditing, values, errors, setValue, markTouched, isInvalid },
}: {
  form: SecretForm;
}) => (
  <EuiFormRow
    label={i18n.translate('xpack.secretsUi.flyout.valueLabel', {
      defaultMessage: 'Value',
    })}
    helpText={
      isEditing
        ? i18n.translate('xpack.secretsUi.flyout.valueEditHelp', {
            defaultMessage:
              'The current value is never shown. Leave this empty to keep it, or enter the value that replaces it.',
          })
        : i18n.translate('xpack.secretsUi.flyout.valueHelp', {
            defaultMessage: 'It is stored encrypted and never shown again.',
          })
    }
    isInvalid={isInvalid('value')}
    error={errors.value}
    fullWidth
  >
    <EuiFieldPassword
      type="dual"
      value={values.value}
      autoComplete="new-password"
      isInvalid={isInvalid('value')}
      onChange={(event) => setValue('value', event.target.value)}
      onBlur={() => markTouched('value')}
      fullWidth
      data-test-subj="secretValueInput"
    />
  </EuiFormRow>
);

/** The connector that holds the value of a secret, and where the value is in the connector. */
export const ConnectorSourceFields = ({
  form: { values, errors, setValue, markTouched, isInvalid },
  connectors,
  isLoadingConnectors,
}: {
  form: SecretForm;
  connectors: readonly SecretConnector[];
  isLoadingConnectors: boolean;
}) => {
  const selectedConnector = connectors.find(({ id }) => id === values.connectorId);

  const connectorOptions = connectors.map(({ id, name, type: { displayName } }) => ({
    value: id,
    inputDisplay: name,
    dropdownDisplay: (
      <>
        <EuiText size="s">{name}</EuiText>
        <EuiText size="xs" color="subdued">
          {displayName}
        </EuiText>
      </>
    ),
  }));

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.secretsUi.flyout.connectorLabel', {
          defaultMessage: 'Connector',
        })}
        isInvalid={isInvalid('connectorId')}
        error={errors.connectorId}
        fullWidth
      >
        <EuiSuperSelect
          options={connectorOptions}
          valueOfSelected={values.connectorId}
          isLoading={isLoadingConnectors}
          isInvalid={isInvalid('connectorId')}
          placeholder={i18n.translate('xpack.secretsUi.flyout.connectorPlaceholder', {
            defaultMessage: 'Select a connector',
          })}
          onChange={(connectorId) => {
            setValue('connectorId', connectorId);
            markTouched('connectorId');
          }}
          fullWidth
          data-test-subj="secretConnectorSelect"
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.secretsUi.flyout.referenceLabel', {
          defaultMessage: 'Reference',
        })}
        helpText={
          selectedConnector
            ? i18n.translate('xpack.secretsUi.flyout.referenceHelp', {
                defaultMessage: 'A reference looks like {format}',
                values: { format: selectedConnector.type.referenceFormat },
              })
            : i18n.translate('xpack.secretsUi.flyout.referenceHelpNoConnector', {
                defaultMessage: 'Where the value is, in the service of the connector.',
              })
        }
        isInvalid={isInvalid('reference')}
        error={errors.reference}
        fullWidth
      >
        <EuiFieldText
          value={values.reference}
          isInvalid={isInvalid('reference')}
          onChange={(event) => setValue('reference', event.target.value)}
          onBlur={() => markTouched('reference')}
          fullWidth
          data-test-subj="secretReferenceInput"
        />
      </EuiFormRow>
    </>
  );
};
