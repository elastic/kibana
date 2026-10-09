/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiFormRow,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnInfoCallout } from '@kbn/ui-callout';

import {
  KAFKA_OAUTH2_MINIMUM_FLEET_SERVER_VERSION,
  kafkaOAuth2GrantType,
  kafkaOAuth2SignatureAlgorithm,
} from '../../../../../../../common/constants';
import { MultiRowInput } from '../multi_row_input';

import type { OutputFormInputsType } from './use_output_form';
import { isKafkaOAuth2JwtBearer } from './use_kafka_oauth2_inputs';
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

const grantTypeOptions = [
  {
    id: kafkaOAuth2GrantType.ClientCredentials,
    label: i18n.translate('xpack.fleet.settings.editOutputFlyout.kafkaOAuth2ClientCredentials', {
      defaultMessage: 'Client credentials',
    }),
    'data-test-subj': 'kafkaOAuth2GrantTypeClientCredentialsRadioButton',
  },
  {
    id: kafkaOAuth2GrantType.JwtBearer,
    label: i18n.translate('xpack.fleet.settings.editOutputFlyout.kafkaOAuth2JwtBearer', {
      defaultMessage: 'JWT bearer',
    }),
    'data-test-subj': 'kafkaOAuth2GrantTypeJwtBearerRadioButton',
  },
];

const signatureAlgorithmOptions = Object.values(kafkaOAuth2SignatureAlgorithm).map((algorithm) => ({
  text: algorithm,
  value: algorithm,
}));

/** A setting that is a path on the host of the agent, or a plain text one. */
const TextSetting: React.FunctionComponent<{
  label: string;
  helpText?: string;
  input: { props: React.ComponentProps<typeof EuiFieldText>; formRowProps: object };
  testSubj: string;
}> = ({ label, helpText, input, testSubj }) => (
  <EuiFormRow fullWidth label={label} helpText={helpText} {...input.formRowProps}>
    <EuiFieldText
      fullWidth
      compressed
      data-test-subj={`settingsOutputsFlyout.${testSubj}`}
      {...input.props}
    />
  </EuiFormRow>
);

const filePathHelpText = i18n.translate(
  'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2FilePathHelpText',
  { defaultMessage: 'Path on the host of the agent.' }
);

/** Settings of the OAuth2 authentication method of the Kafka output. */
export const OutputFormKafkaOAuth2: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({
  inputs,
}) => {
  const isJwtBearer = isKafkaOAuth2JwtBearer(inputs);
  // the advanced settings are open when one of them is set, so that it is not missed
  const hasAdvancedSettings =
    [
      inputs.kafkaOAuth2ClientIdFileInput,
      inputs.kafkaOAuth2ClientSecretFileInput,
      inputs.kafkaOAuth2ClientCertificateKeyFileInput,
      inputs.kafkaOAuth2ClientCertificateKeyIdInput,
      inputs.kafkaOAuth2IssInput,
      inputs.kafkaOAuth2AudienceInput,
      inputs.kafkaOAuth2ClaimsInput,
      inputs.kafkaOAuth2TlsCaFileInput,
      inputs.kafkaOAuth2TlsCertFileInput,
      inputs.kafkaOAuth2TlsKeyFileInput,
      inputs.kafkaOAuth2TlsServerNameOverrideInput,
      inputs.kafkaOAuth2TlsMinVersionInput,
      inputs.kafkaOAuth2TlsMaxVersionInput,
    ].some((input) => !!input.value) || inputs.kafkaOAuth2TlsInsecureSkipVerifyInput.value;

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
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2GrantTypeLabel"
            defaultMessage="Grant type"
          />
        }
      >
        <EuiRadioGroup
          name="kafkaOAuth2GrantType"
          style={{ display: 'flex', gap: 30 }}
          data-test-subj="settingsOutputsFlyout.kafkaOAuth2GrantTypeInput"
          options={grantTypeOptions}
          compressed
          {...inputs.kafkaOAuth2GrantTypeInput.props}
        />
      </EuiFormRow>
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
      {isJwtBearer ? (
        // a key per grant: each row has its own state, e.g. whether a saved value is hidden
        <SecretFormRow
          key="kafkaOAuth2ClientCertificateKey"
          fullWidth
          title={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2ClientCertificateKeyTitle',
            { defaultMessage: 'Private key' }
          )}
          {...inputs.kafkaOAuth2ClientCertificateKeyInput.formRowProps}
          useSecretsStorage={true}
          cancelEdit={inputs.kafkaOAuth2ClientCertificateKeyInput.cancelEdit}
        >
          <EuiTextArea
            fullWidth
            rows={5}
            data-test-subj="settingsOutputsFlyout.kafkaOAuth2ClientCertificateKeyInput"
            {...inputs.kafkaOAuth2ClientCertificateKeyInput.props}
          />
        </SecretFormRow>
      ) : (
        <SecretFormRow
          key="kafkaOAuth2ClientSecret"
          fullWidth
          title={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2ClientSecretTitle',
            { defaultMessage: 'Client secret' }
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
      )}
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
      <EuiSpacer size="s" />
      <EuiAccordion
        id="kafkaOAuth2AdvancedSettings"
        data-test-subj="settingsOutputsFlyout.kafkaOAuth2AdvancedSettings"
        initialIsOpen={hasAdvancedSettings}
        paddingSize="m"
        buttonContent={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2AdvancedSettingsLabel"
            defaultMessage="Advanced settings"
          />
        }
      >
        <TextSetting
          label={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2ClientIdFileLabel',
            { defaultMessage: 'Client ID file (optional)' }
          )}
          helpText={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2ClientIdFileHelpText',
            {
              defaultMessage:
                'Path, on the host of the agent, of a file with the client ID. It replaces the client ID.',
            }
          )}
          input={inputs.kafkaOAuth2ClientIdFileInput}
          testSubj="kafkaOAuth2ClientIdFileInput"
        />
        {isJwtBearer ? (
          <>
            <TextSetting
              label={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2ClientCertificateKeyFileLabel',
                { defaultMessage: 'Private key file (optional)' }
              )}
              helpText={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2ClientCertificateKeyFileHelpText',
                {
                  defaultMessage:
                    'Path, on the host of the agent, of a file with the private key. It replaces the private key.',
                }
              )}
              input={inputs.kafkaOAuth2ClientCertificateKeyFileInput}
              testSubj="kafkaOAuth2ClientCertificateKeyFileInput"
            />
            <TextSetting
              label={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2ClientCertificateKeyIdLabel',
                { defaultMessage: 'Key ID (optional)' }
              )}
              input={inputs.kafkaOAuth2ClientCertificateKeyIdInput}
              testSubj="kafkaOAuth2ClientCertificateKeyIdInput"
            />
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2SignatureAlgorithmLabel"
                  defaultMessage="Signature algorithm"
                />
              }
            >
              <EuiSelect
                fullWidth
                compressed
                options={signatureAlgorithmOptions}
                data-test-subj="settingsOutputsFlyout.kafkaOAuth2SignatureAlgorithmInput"
                {...inputs.kafkaOAuth2SignatureAlgorithmInput.props}
              />
            </EuiFormRow>
            <TextSetting
              label={i18n.translate('xpack.fleet.settings.editOutputFlyout.kafkaOAuth2IssLabel', {
                defaultMessage: 'Issuer (optional)',
              })}
              helpText={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2IssHelpText',
                { defaultMessage: 'Defaults to the client ID.' }
              )}
              input={inputs.kafkaOAuth2IssInput}
              testSubj="kafkaOAuth2IssInput"
            />
            <TextSetting
              label={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2AudienceLabel',
                { defaultMessage: 'Audience (optional)' }
              )}
              helpText={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2AudienceHelpText',
                { defaultMessage: 'Defaults to the token URL.' }
              )}
              input={inputs.kafkaOAuth2AudienceInput}
              testSubj="kafkaOAuth2AudienceInput"
            />
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2ClaimsLabel"
                  defaultMessage="Additional claims (optional)"
                />
              }
              helpText={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2ClaimsHelpText"
                  defaultMessage="A JSON object with claims added to the token."
                />
              }
              {...inputs.kafkaOAuth2ClaimsInput.formRowProps}
            >
              <EuiTextArea
                fullWidth
                compressed
                rows={3}
                data-test-subj="settingsOutputsFlyout.kafkaOAuth2ClaimsInput"
                {...inputs.kafkaOAuth2ClaimsInput.props}
              />
            </EuiFormRow>
          </>
        ) : (
          <TextSetting
            label={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2ClientSecretFileLabel',
              { defaultMessage: 'Client secret file (optional)' }
            )}
            helpText={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2ClientSecretFileHelpText',
              {
                defaultMessage:
                  'Path, on the host of the agent, of a file with the client secret. It replaces the client secret.',
              }
            )}
            input={inputs.kafkaOAuth2ClientSecretFileInput}
            testSubj="kafkaOAuth2ClientSecretFileInput"
          />
        )}
        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h4>
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.kafkaOAuth2TlsTitle"
              defaultMessage="Token endpoint TLS"
            />
          </h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <TextSetting
          label={i18n.translate('xpack.fleet.settings.editOutputFlyout.kafkaOAuth2TlsCaFileLabel', {
            defaultMessage: 'Certificate authority file (optional)',
          })}
          helpText={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2TlsCaFileHelpText',
            {
              defaultMessage:
                'Path, on the host of the agent, of the certificate authority that signed the certificate of the token endpoint.',
            }
          )}
          input={inputs.kafkaOAuth2TlsCaFileInput}
          testSubj="kafkaOAuth2TlsCaFileInput"
        />
        <TextSetting
          label={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2TlsCertFileLabel',
            { defaultMessage: 'Client certificate file (optional)' }
          )}
          helpText={filePathHelpText}
          input={inputs.kafkaOAuth2TlsCertFileInput}
          testSubj="kafkaOAuth2TlsCertFileInput"
        />
        <TextSetting
          label={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2TlsKeyFileLabel',
            {
              defaultMessage: 'Client certificate key file (optional)',
            }
          )}
          helpText={filePathHelpText}
          input={inputs.kafkaOAuth2TlsKeyFileInput}
          testSubj="kafkaOAuth2TlsKeyFileInput"
        />
        <TextSetting
          label={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2TlsServerNameOverrideLabel',
            { defaultMessage: 'Server name override (optional)' }
          )}
          input={inputs.kafkaOAuth2TlsServerNameOverrideInput}
          testSubj="kafkaOAuth2TlsServerNameOverrideInput"
        />
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <TextSetting
              label={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2TlsMinVersionLabel',
                { defaultMessage: 'Minimum TLS version (optional)' }
              )}
              input={inputs.kafkaOAuth2TlsMinVersionInput}
              testSubj="kafkaOAuth2TlsMinVersionInput"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <TextSetting
              label={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2TlsMaxVersionLabel',
                { defaultMessage: 'Maximum TLS version (optional)' }
              )}
              input={inputs.kafkaOAuth2TlsMaxVersionInput}
              testSubj="kafkaOAuth2TlsMaxVersionInput"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiSwitch
          compressed
          label={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.kafkaOAuth2TlsInsecureSkipVerifyLabel',
            { defaultMessage: 'Skip the verification of the server certificate' }
          )}
          data-test-subj="settingsOutputsFlyout.kafkaOAuth2TlsInsecureSkipVerifyInput"
          {...inputs.kafkaOAuth2TlsInsecureSkipVerifyInput.props}
        />
      </EuiAccordion>
    </>
  );
};
