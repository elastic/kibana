/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiFormRow,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';

import { KAFKA_OAUTH2_MINIMUM_FLEET_SERVER_VERSION } from '../../../../../../../common/constants';
import { useFleetStatus } from '../../../../hooks';

import { MultiRowInput } from '../multi_row_input';

import type { OutputFormInputsType } from './use_output_form';
import { SecretFormRow } from './output_form_secret_form_row';

type EndpointParamsErrors = Array<{
  message: string;
  index: number;
  hasKeyError: boolean;
  hasValueError: boolean;
}>;

const EndpointParams: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({ inputs }) => {
  const {
    props: { onChange, disabled },
    value: rows,
    formRowProps: { error },
  } = inputs.kafkaOAuth2EndpointParamsInput;
  const errors = error as EndpointParamsErrors | undefined;
  const deleteParamLabel = i18n.translate(
    'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2EndpointParamDeleteAriaLabel',
    { defaultMessage: 'Delete parameter' }
  );

  const updateRow = useCallback(
    (index: number, field: 'key' | 'value', value: string) => {
      onChange(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    },
    [rows, onChange]
  );

  return (
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2EndpointParamsLabel"
          defaultMessage="Token endpoint parameters (optional)"
        />
      }
      helpText={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2EndpointParamsHelpText"
          defaultMessage="Additional parameters sent to the token endpoint, such as the audience or the resource. Repeat a name to send several values."
        />
      }
    >
      <>
        {rows.map((row, index) => {
          const rowErrors = errors?.filter((e) => e.index === index) ?? [];
          return (
            <React.Fragment key={index}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem>
                  <EuiFieldText
                    compressed
                    fullWidth
                    disabled={disabled}
                    isInvalid={rowErrors.some((e) => e.hasKeyError)}
                    value={row.key}
                    onChange={(e) => updateRow(index, 'key', e.target.value)}
                    aria-label={i18n.translate(
                      'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2EndpointParamNameAriaLabel',
                      { defaultMessage: 'Parameter name' }
                    )}
                    placeholder={i18n.translate(
                      'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2EndpointParamNamePlaceholder',
                      { defaultMessage: 'Name' }
                    )}
                    data-test-subj={`settingsOutputsFlyout.kafkaOAuth2EndpointParamName${index}`}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFieldText
                    compressed
                    fullWidth
                    disabled={disabled}
                    isInvalid={rowErrors.some((e) => e.hasValueError)}
                    value={row.value}
                    onChange={(e) => updateRow(index, 'value', e.target.value)}
                    aria-label={i18n.translate(
                      'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2EndpointParamValueAriaLabel',
                      { defaultMessage: 'Parameter value' }
                    )}
                    placeholder={i18n.translate(
                      'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2EndpointParamValuePlaceholder',
                      { defaultMessage: 'Value' }
                    )}
                    data-test-subj={`settingsOutputsFlyout.kafkaOAuth2EndpointParamValue${index}`}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={deleteParamLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="trash"
                      color="danger"
                      isDisabled={disabled || rows.length === 1}
                      onClick={() => onChange(rows.filter((_, i) => i !== index))}
                      aria-label={deleteParamLabel}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
              {rowErrors.map(({ message }) => (
                <EuiFormErrorText key={message}>{message}</EuiFormErrorText>
              ))}
              <EuiSpacer size="xs" />
            </React.Fragment>
          );
        })}
        <EuiButtonEmpty
          size="xs"
          iconType="plusCircle"
          isDisabled={disabled}
          onClick={() => onChange([...rows, { key: '', value: '' }])}
          data-test-subj="settingsOutputsFlyout.kafkaOAuth2AddEndpointParam"
        >
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2AddEndpointParam"
            defaultMessage="Add parameter"
          />
        </EuiButtonEmpty>
      </>
    </EuiFormRow>
  );
};

/** Settings of the OAuth2 authentication method of the Kafka output. */
export const OutputFormKafkaOAuth2: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({
  inputs,
}) => {
  const fleetStatus = useFleetStatus();

  return (
    <>
      <EuiSpacer size="m" />
      <KbnInfoCallout
        size="s"
        title={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2VersionCalloutTitle"
            defaultMessage="Requires Elastic Agent {minVersion} or later"
            values={{ minVersion: KAFKA_OAUTH2_MINIMUM_FLEET_SERVER_VERSION }}
          />
        }
        text={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2VersionCalloutText"
            defaultMessage="Agents running an older version cannot authenticate to Kafka with OAuth2. The broker timeout setting does not apply."
          />
        }
        data-test-subj="settingsOutputsFlyout.kafkaOAuth2VersionCallout"
      />
      {fleetStatus?.isSecretsStorageEnabled === false && (
        <>
          <EuiSpacer size="s" />
          <KbnWarningCallout
            size="s"
            title={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2SecretsStorageCalloutTitle"
                defaultMessage="Secrets storage is not available"
              />
            }
            text={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2SecretsStorageCalloutText"
                defaultMessage="The client secret is always stored as a secret, so this output cannot be saved until all Fleet Servers support secrets storage."
              />
            }
            data-test-subj="settingsOutputsFlyout.kafkaOAuth2SecretsStorageCallout"
          />
        </>
      )}
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2ClientIdLabel"
            defaultMessage="Client ID"
          />
        }
        {...inputs.kafkaOAuth2ClientIdInput.formRowProps}
      >
        <EuiFieldText
          fullWidth
          data-test-subj="settingsOutputsFlyout.kafkaOAuth2ClientIdInput"
          {...inputs.kafkaOAuth2ClientIdInput.props}
        />
      </EuiFormRow>
      <SecretFormRow
        fullWidth
        title={i18n.translate(
          'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2ClientSecretTitle',
          {
            defaultMessage: 'Client secret',
          }
        )}
        {...inputs.kafkaOAuth2ClientSecretInput.formRowProps}
        useSecretsStorage={true}
        cancelEdit={inputs.kafkaOAuth2ClientSecretInput.cancelEdit}
      >
        <EuiFieldPassword
          type={'dual'}
          fullWidth
          data-test-subj="settingsOutputsFlyout.kafkaOAuth2ClientSecretInput"
          {...inputs.kafkaOAuth2ClientSecretInput.props}
        />
      </SecretFormRow>
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2TokenUrlLabel"
            defaultMessage="Token URL"
          />
        }
        {...inputs.kafkaOAuth2TokenUrlInput.formRowProps}
      >
        <EuiFieldText
          fullWidth
          placeholder="https://"
          data-test-subj="settingsOutputsFlyout.kafkaOAuth2TokenUrlInput"
          {...inputs.kafkaOAuth2TokenUrlInput.props}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <MultiRowInput
        placeholder={i18n.translate(
          'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2ScopesPlaceholder',
          { defaultMessage: 'Specify scope' }
        )}
        label={i18n.translate('xpack.fleet.settings.editOutputFlyout.kafkaOAuth2ScopesLabel', {
          defaultMessage: 'Scopes (optional)',
        })}
        sortable={false}
        {...inputs.kafkaOAuth2ScopesInput.props}
      />
      <EuiSpacer size="m" />
      <EndpointParams inputs={inputs} />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2TlsCaFileLabel"
            defaultMessage="Token endpoint certificate authority (optional)"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2TlsCaFileHelpText"
            defaultMessage="Path, on the host of the agent, of the certificate authority that signed the certificate of the token endpoint."
          />
        }
        {...inputs.kafkaOAuth2TlsCaFileInput.formRowProps}
      >
        <EuiFieldText
          fullWidth
          data-test-subj="settingsOutputsFlyout.kafkaOAuth2TlsCaFileInput"
          {...inputs.kafkaOAuth2TlsCaFileInput.props}
        />
      </EuiFormRow>
    </>
  );
};
