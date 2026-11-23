/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFieldPassword,
  EuiFieldText,
  EuiFormRow,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';

import { kafkaKerberosAuthType } from '../../../../../../../common/constants';
import { useFleetStatus } from '../../../../hooks';

import type { OutputFormInputsType } from './use_output_form';
import { isKafkaKerberosPassword } from './use_kafka_kerberos_inputs';
import { SecretFormRow } from './output_form_secret_form_row';

const authTypeOptions = [
  {
    id: kafkaKerberosAuthType.Keytab,
    label: i18n.translate('xpack.fleet.settings.editOutputFlyout.kafkaKerberosKeytab', {
      defaultMessage: 'Keytab',
    }),
    'data-test-subj': 'kafkaKerberosAuthTypeKeytabRadioButton',
  },
  {
    id: kafkaKerberosAuthType.Password,
    label: i18n.translate('xpack.fleet.settings.editOutputFlyout.kafkaKerberosPassword', {
      defaultMessage: 'Username / Password',
    }),
    'data-test-subj': 'kafkaKerberosAuthTypePasswordRadioButton',
  },
];

/** A text setting of the Kerberos authentication method. */
const TextSetting: React.FunctionComponent<{
  label: string;
  helpText?: string;
  input: { props: React.ComponentProps<typeof EuiFieldText>; formRowProps: object };
  testSubj: string;
}> = ({ label, helpText, input, testSubj }) => (
  <EuiFormRow fullWidth label={label} helpText={helpText} {...input.formRowProps}>
    <EuiFieldText fullWidth data-test-subj={`settingsOutputsFlyout.${testSubj}`} {...input.props} />
  </EuiFormRow>
);

/** Settings of the Kerberos authentication method of the Kafka output. */
export const OutputFormKafkaKerberos: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({
  inputs,
}) => {
  const isPassword = isKafkaKerberosPassword(inputs);
  // Kerberos does not work in FIPS mode: the warning is only useful in a FIPS environment
  const { isFipsEnabled } = useFleetStatus();

  return (
    <>
      <EuiSpacer size="m" />
      <KbnInfoCallout
        size="s"
        title={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaKerberosHostFilesCalloutTitle"
            defaultMessage="Kerberos files must exist on the Elastic Agent host"
          />
        }
        text={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaKerberosHostFilesCalloutText"
            defaultMessage="Use paths that point to the Kerberos files on each Elastic Agent host that sends data to this output."
          />
        }
        data-test-subj="settingsOutputsFlyout.kafkaKerberosHostFilesCallout"
      />
      {isFipsEnabled && (
        <>
          <EuiSpacer size="s" />
          <KbnWarningCallout
            size="s"
            title={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaKerberosFipsCalloutTitle"
                defaultMessage="Not supported on agents in FIPS mode"
              />
            }
            text={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaKerberosFipsCalloutText"
                defaultMessage="Agents in FIPS mode can't use Kerberos. They fail to send data if this output uses it."
              />
            }
            data-test-subj="settingsOutputsFlyout.kafkaKerberosFipsCallout"
          />
        </>
      )}
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaKerberosAuthTypeLabel"
            defaultMessage="Authenticate with"
          />
        }
      >
        <EuiRadioGroup
          name="kafkaKerberosAuthType"
          style={{ display: 'flex', gap: 30 }}
          data-test-subj="settingsOutputsFlyout.kafkaKerberosAuthTypeInput"
          options={authTypeOptions}
          compressed
          {...inputs.kafkaKerberosAuthTypeInput.props}
        />
      </EuiFormRow>
      <TextSetting
        label={i18n.translate(
          'xpack.fleet.settings.editOutputFlyout.kafkaKerberosConfigPathLabel',
          {
            defaultMessage: 'Kerberos configuration file',
          }
        )}
        helpText={i18n.translate(
          'xpack.fleet.settings.editOutputFlyout.kafkaKerberosConfigPathHelpText',
          { defaultMessage: 'Path to the krb5.conf file on the Elastic Agent host.' }
        )}
        input={inputs.kafkaKerberosConfigPathInput}
        testSubj="kafkaKerberosConfigPathInput"
      />
      <TextSetting
        label={i18n.translate('xpack.fleet.settings.editOutputFlyout.kafkaKerberosRealmLabel', {
          defaultMessage: 'Realm',
        })}
        input={inputs.kafkaKerberosRealmInput}
        testSubj="kafkaKerberosRealmInput"
      />
      {isPassword ? (
        <>
          <TextSetting
            label={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.kafkaKerberosUsernameLabel',
              { defaultMessage: 'Username' }
            )}
            input={inputs.kafkaKerberosUsernameInput}
            testSubj="kafkaKerberosUsernameInput"
          />
          <SecretFormRow
            fullWidth
            title={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.kafkaKerberosPasswordTitle',
              { defaultMessage: 'Password' }
            )}
            {...inputs.kafkaKerberosPasswordInput.formRowProps}
            useSecretsStorage={true}
            cancelEdit={inputs.kafkaKerberosPasswordInput.cancelEdit}
          >
            <EuiFieldPassword
              type={'dual'}
              fullWidth
              data-test-subj="settingsOutputsFlyout.kafkaKerberosPasswordInput"
              {...inputs.kafkaKerberosPasswordInput.props}
            />
          </SecretFormRow>
        </>
      ) : (
        <TextSetting
          label={i18n.translate('xpack.fleet.settings.editOutputFlyout.kafkaKerberosKeytabLabel', {
            defaultMessage: 'Keytab file',
          })}
          helpText={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.kafkaKerberosKeytabHelpText',
            { defaultMessage: 'Path to the keytab file on the Elastic Agent host.' }
          )}
          input={inputs.kafkaKerberosKeytabInput}
          testSubj="kafkaKerberosKeytabInput"
        />
      )}
      <TextSetting
        label={i18n.translate(
          'xpack.fleet.settings.editOutputFlyout.kafkaKerberosServiceNameLabel',
          { defaultMessage: 'Service name (optional)' }
        )}
        helpText={i18n.translate(
          'xpack.fleet.settings.editOutputFlyout.kafkaKerberosServiceNameHelpText',
          { defaultMessage: 'Kerberos service name of the Kafka brokers.' }
        )}
        input={inputs.kafkaKerberosServiceNameInput}
        testSubj="kafkaKerberosServiceNameInput"
      />
      <EuiSpacer size="m" />
      <EuiSwitch
        compressed
        label={i18n.translate('xpack.fleet.settings.editOutputFlyout.kafkaKerberosFastLabel', {
          defaultMessage: 'Use Kerberos FAST authentication',
        })}
        data-test-subj="settingsOutputsFlyout.kafkaKerberosEnableFastInput"
        {...inputs.kafkaKerberosEnableFastInput.props}
      />
    </>
  );
};
