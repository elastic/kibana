/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiAccordion, EuiIcon, EuiText, EuiTextArea } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { OtlpTlsCurvePreference } from '../../../../../../../common/types/models';

import type { OutputFormInputsType } from './use_output_form';
import { isOtlpGrpc } from './use_otlp_inputs';
import {
  getOtlpTlsPairedErrors,
  hasOtlpTlsErrors,
  hasOtlpTlsSettings,
  isOtlpTlsKeyPemRemovable,
  isOtlpTlsKeyPemRemoved,
} from './use_otlp_tls_inputs';
import {
  OTLP_TLS_CIPHER_SUITES,
  OTLP_TLS_DEFAULT_MIN_VERSION,
  OTLP_TLS_INSECURE_CIPHER_SUITES,
  OTLP_TLS_VERSIONS,
} from './output_form_validators';
import { OtlpDefaultHint } from './otlp_spec';
import {
  getSettingErrors,
  OtlpComboBoxSetting,
  OtlpSelectSetting,
  OtlpSettingsGroup,
  OtlpSettingsSpecs,
  OtlpSwitchSetting,
  OtlpTextAreaSetting,
  OtlpTextSetting,
} from './otlp_setting_fields';
import { SecretFormRow } from './output_form_secret_form_row';

const OTLP_TLS_CURVES: readonly OtlpTlsCurvePreference[] = ['X25519', 'P521', 'P256', 'P384'];
const CURVE_OPTIONS = OTLP_TLS_CURVES.map((curve) => ({ label: curve }));

const CIPHER_SUITE_OPTIONS = [
  {
    label: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpTlsSecureCipherSuitesGroup', {
      defaultMessage: 'Cipher suites',
    }),
    options: OTLP_TLS_CIPHER_SUITES.map((suite) => ({ label: suite })),
  },
  {
    label: i18n.translate(
      'xpack.fleet.settings.editOutputFlyout.otlpTlsInsecureCipherSuitesGroup',
      { defaultMessage: 'Insecure cipher suites, which have to be allowed' }
    ),
    options: OTLP_TLS_INSECURE_CIPHER_SUITES.map((suite) => ({ label: suite })),
  },
];

const TLS_VERSION_OPTIONS = [
  {
    value: '',
    text: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpTlsVersionDefaultOption', {
      defaultMessage: 'Default',
    }),
  },
  ...OTLP_TLS_VERSIONS.map((version) => ({ value: version, text: version })),
];

/** The version options, with a stored version that is not one of them, so that it is shown. */
const getTlsVersionOptions = (value: string) =>
  !value || (OTLP_TLS_VERSIONS as readonly string[]).includes(value)
    ? TLS_VERSION_OPTIONS
    : [...TLS_VERSION_OPTIONS, { value, text: value }];

const notSetDefault = (
  <OtlpDefaultHint
    defaultText={
      <FormattedMessage
        id="xpack.fleet.settings.editOutputFlyout.otlpTlsNotSetDefault"
        defaultMessage="not set"
      />
    }
  />
);

const agentFileHint = (
  <FormattedMessage
    id="xpack.fleet.settings.editOutputFlyout.otlpTlsAgentFileHint"
    defaultMessage="A path on the host of the agent. {defaultHint}"
    values={{ defaultHint: notSetDefault }}
  />
);

export const OtlpTlsSettings: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({
  inputs,
}) => {
  const pairedErrors = getOtlpTlsPairedErrors(inputs);
  const { otlpTlsKeyPemInput, otlpTlsMinVersionInput, otlpTlsMaxVersionInput } = inputs;
  // the section stays open while a setting shows an error, so that the reason Save is disabled can
  // be seen: its toggle is disabled, and its title says why
  const hasErrors = hasOtlpTlsErrors(inputs);
  const [isOpen, setIsOpen] = useState(() => hasOtlpTlsSettings(inputs));

  return (
    <EuiAccordion
      id="otlpTlsSettings"
      data-test-subj="settingsOutputsFlyout.otlpTlsSettings"
      forceState={isOpen || hasErrors ? 'open' : 'closed'}
      onToggle={setIsOpen}
      isDisabled={hasErrors}
      paddingSize="m"
      buttonContent={
        <>
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpTlsSettingsLabel"
            defaultMessage="TLS"
          />
          {hasErrors && (
            <EuiText
              component="span"
              size="xs"
              color="danger"
              data-test-subj="settingsOutputsFlyout.otlpTlsSettingsErrors"
            >
              {' '}
              <EuiIcon type="warning" color="danger" size="s" aria-hidden={true} />{' '}
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.otlpTlsSettingsErrorsLabel"
                defaultMessage="Fix the errors in this section to collapse it"
              />
            </EuiText>
          )}
        </>
      }
    >
      <OtlpSettingsSpecs specs={['configTls']} />
      <OtlpSettingsGroup
        testSubj="otlpTlsConnectionGroup"
        title={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpTlsConnectionGroupTitle"
            defaultMessage="Connection security"
          />
        }
      >
        <OtlpSwitchSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsInsecureLabel"
              defaultMessage="Disable TLS (insecure)"
            />
          }
          helpText={
            isOtlpGrpc(inputs) ? (
              <OtlpDefaultHint defaultValue="false" />
            ) : (
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.otlpTlsInsecureHttpHelpText"
                defaultMessage="With HTTP, the scheme of the endpoint (http or https) decides whether TLS is used. {defaultHint}"
                values={{ defaultHint: <OtlpDefaultHint defaultValue="false" /> }}
              />
            )
          }
          input={inputs.otlpTlsInsecureInput}
          testSubj="otlpTlsInsecureInput"
        />
        <OtlpSwitchSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsInsecureSkipVerifyLabel"
              defaultMessage="Skip the verification of the server certificate"
            />
          }
          helpText={<OtlpDefaultHint defaultValue="false" />}
          input={inputs.otlpTlsInsecureSkipVerifyInput}
          testSubj="otlpTlsInsecureSkipVerifyInput"
        />
        <OtlpTextSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsServerNameOverrideLabel"
              defaultMessage="Server name override (optional)"
            />
          }
          helpText={
            <OtlpDefaultHint
              defaultText={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.otlpTlsServerNameOverrideDefault"
                  defaultMessage="the host of the endpoint"
                />
              }
            />
          }
          input={inputs.otlpTlsServerNameOverrideInput}
          testSubj="otlpTlsServerNameOverrideInput"
        />
        <OtlpSwitchSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsIncludeSystemCaCertsPoolLabel"
              defaultMessage="Also trust the certificate authorities of the system"
            />
          }
          helpText={<OtlpDefaultHint defaultValue="false" />}
          input={inputs.otlpTlsIncludeSystemCaCertsPoolInput}
          testSubj="otlpTlsIncludeSystemCaCertsPoolInput"
        />
      </OtlpSettingsGroup>
      <OtlpSettingsGroup
        testSubj="otlpTlsCaGroup"
        title={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpTlsCaGroupTitle"
            defaultMessage="Certificate authority"
          />
        }
      >
        <OtlpTextAreaSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsCaPemLabel"
              defaultMessage="Certificate authority, PEM (optional)"
            />
          }
          helpText={
            <OtlpDefaultHint
              defaultText={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.otlpTlsCaDefault"
                  defaultMessage="the certificate authorities of the system"
                />
              }
            />
          }
          input={inputs.otlpTlsCaPemInput}
          testSubj="otlpTlsCaPemInput"
        />
        <OtlpTextSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsCaFileLabel"
              defaultMessage="Certificate authority file (optional)"
            />
          }
          helpText={agentFileHint}
          input={inputs.otlpTlsCaFileInput}
          testSubj="otlpTlsCaFileInput"
          otherErrors={pairedErrors.caFile}
        />
      </OtlpSettingsGroup>
      <OtlpSettingsGroup
        testSubj="otlpTlsClientCertGroup"
        title={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpTlsClientCertGroupTitle"
            defaultMessage="Client certificate (mutual TLS)"
          />
        }
      >
        <OtlpTextAreaSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsCertPemLabel"
              defaultMessage="Client certificate, PEM (optional)"
            />
          }
          helpText={notSetDefault}
          input={inputs.otlpTlsCertPemInput}
          testSubj="otlpTlsCertPemInput"
          otherErrors={pairedErrors.certPem}
        />
        <OtlpTextSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsCertFileLabel"
              defaultMessage="Client certificate file (optional)"
            />
          }
          helpText={agentFileHint}
          input={inputs.otlpTlsCertFileInput}
          testSubj="otlpTlsCertFileInput"
          otherErrors={pairedErrors.certFile}
        />
        <SecretFormRow
          fullWidth
          title={i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpTlsKeyPemLabel', {
            defaultMessage: 'Client key, PEM',
          })}
          {...otlpTlsKeyPemInput.formRowProps}
          error={[...(otlpTlsKeyPemInput.errors ?? []), ...(pairedErrors.keyPem ?? [])]}
          isInvalid={otlpTlsKeyPemInput.formRowProps.isInvalid || !!pairedErrors.keyPem}
          useSecretsStorage={true}
          secretType="otlp"
          cancelEdit={otlpTlsKeyPemInput.cancelEdit}
          onRemove={
            isOtlpTlsKeyPemRemovable(inputs)
              ? () => otlpTlsKeyPemInput.setValue(undefined)
              : undefined
          }
          isRemoved={isOtlpTlsKeyPemRemoved(inputs)}
        >
          <EuiTextArea
            fullWidth
            rows={5}
            data-test-subj="settingsOutputsFlyout.otlpTlsKeyPemInput"
            {...otlpTlsKeyPemInput.props}
            isInvalid={otlpTlsKeyPemInput.formRowProps.isInvalid || !!pairedErrors.keyPem}
            onBlur={() => otlpTlsKeyPemInput.validate()}
          />
        </SecretFormRow>
        <OtlpTextSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsKeyFileLabel"
              defaultMessage="Client key file (optional)"
            />
          }
          helpText={agentFileHint}
          input={inputs.otlpTlsKeyFileInput}
          testSubj="otlpTlsKeyFileInput"
          otherErrors={pairedErrors.keyFile}
        />
      </OtlpSettingsGroup>
      <OtlpSettingsGroup
        testSubj="otlpTlsProtocolGroup"
        title={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpTlsProtocolGroupTitle"
            defaultMessage="Protocol"
          />
        }
      >
        <OtlpSelectSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsMinVersionLabel"
              defaultMessage="Minimum TLS version"
            />
          }
          helpText={<OtlpDefaultHint defaultValue={OTLP_TLS_DEFAULT_MIN_VERSION} />}
          input={otlpTlsMinVersionInput}
          testSubj="otlpTlsMinVersionInput"
          options={getTlsVersionOptions(otlpTlsMinVersionInput.value)}
          error={getSettingErrors(otlpTlsMinVersionInput.errors)}
        />
        <OtlpSelectSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsMaxVersionLabel"
              defaultMessage="Maximum TLS version"
            />
          }
          helpText={<OtlpDefaultHint defaultValue="1.3" />}
          input={otlpTlsMaxVersionInput}
          testSubj="otlpTlsMaxVersionInput"
          options={getTlsVersionOptions(otlpTlsMaxVersionInput.value)}
          error={getSettingErrors(otlpTlsMaxVersionInput.errors, pairedErrors.maxVersion)}
        />
        <OtlpComboBoxSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsCipherSuitesLabel"
              defaultMessage="Cipher suites (optional)"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsCipherSuitesHelpText"
              defaultMessage="Cipher suites of TLS 1.2 and lower. The cipher suites of TLS 1.3 cannot be configured. {defaultHint}"
              values={{
                defaultHint: (
                  <OtlpDefaultHint
                    defaultText={
                      <FormattedMessage
                        id="xpack.fleet.settings.editOutputFlyout.otlpTlsCipherSuitesDefault"
                        defaultMessage="a list of secure cipher suites"
                      />
                    }
                  />
                ),
              }}
            />
          }
          input={inputs.otlpTlsCipherSuitesInput}
          testSubj="otlpTlsCipherSuitesInput"
          options={CIPHER_SUITE_OPTIONS}
          otherErrors={pairedErrors.cipherSuites}
        />
        <OtlpSwitchSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsIncludeInsecureCipherSuitesLabel"
              defaultMessage="Allow insecure cipher suites, for legacy systems"
            />
          }
          helpText={<OtlpDefaultHint defaultValue="false" />}
          input={inputs.otlpTlsIncludeInsecureCipherSuitesInput}
          testSubj="otlpTlsIncludeInsecureCipherSuitesInput"
        />
        <OtlpComboBoxSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsCurvePreferencesLabel"
              defaultMessage="Curve preferences (optional)"
            />
          }
          helpText={
            <OtlpDefaultHint
              defaultText={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.otlpTlsCurvePreferencesDefault"
                  defaultMessage="the curves of the Go TLS library, in its order"
                />
              }
            />
          }
          input={inputs.otlpTlsCurvePreferencesInput}
          testSubj="otlpTlsCurvePreferencesInput"
          options={CURVE_OPTIONS}
        />
        <OtlpTextSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsReloadIntervalLabel"
              defaultMessage="Certificate reload interval (optional)"
            />
          }
          helpText={
            <OtlpDefaultHint
              defaultText={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.otlpTlsReloadIntervalDefault"
                  defaultMessage="not set, the certificates are not reloaded"
                />
              }
            />
          }
          input={inputs.otlpTlsReloadIntervalInput}
          testSubj="otlpTlsReloadIntervalInput"
          placeholder="1h"
        />
      </OtlpSettingsGroup>
      <OtlpSettingsGroup
        testSubj="otlpTlsTpmGroup"
        title={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpTlsTpmGroupTitle"
            defaultMessage="Trusted platform module (TPM)"
          />
        }
      >
        <OtlpSwitchSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsTpmEnabledLabel"
              defaultMessage="Load the client key file from the TPM"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsTpmEnabledHelpText"
              defaultMessage="The client key file must be a key in the TSS2 format. {defaultHint}"
              values={{ defaultHint: <OtlpDefaultHint defaultValue="false" /> }}
            />
          }
          input={inputs.otlpTlsTpmEnabledInput}
          testSubj="otlpTlsTpmEnabledInput"
        />
        <OtlpTextSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsTpmPathLabel"
              defaultMessage="TPM device path (optional)"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpTlsTpmPathHelpText"
              defaultMessage="The TPM device or Unix domain socket on the host of the agent. Not supported on Windows. {defaultHint}"
              values={{ defaultHint: notSetDefault }}
            />
          }
          input={inputs.otlpTlsTpmPathInput}
          testSubj="otlpTlsTpmPathInput"
          placeholder="/dev/tpmrm0"
        />
      </OtlpSettingsGroup>
    </EuiAccordion>
  );
};
