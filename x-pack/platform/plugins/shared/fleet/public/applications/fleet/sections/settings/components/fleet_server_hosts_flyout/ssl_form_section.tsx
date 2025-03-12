/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTextArea,
  EuiFormRow,
  EuiRadioGroup,
  EuiSpacer,
  EuiPanel,
  EuiTitle,
  EuiAccordion,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { MultiRowInput } from '../multi_row_input';

import { SecretFormRow } from '../edit_output_flyout/output_form_secret_form_row';

import { clientAuth } from '../../../../../../../common/types';

import type { FleetServerHostSSLInputsType } from './use_fleet_server_host_form';

interface Props {
  inputs: FleetServerHostSSLInputsType;
  useSecretsStorage: boolean;
  isConvertedToSecret: {
    sslKey: boolean;
    sslESKey: boolean;
  };
  onToggleSecretAndClearValue: (secretEnabled: boolean) => void;
}

export const SSLFormSection: React.FunctionComponent<Props> = (props) => {
  const { inputs, useSecretsStorage, isConvertedToSecret, onToggleSecretAndClearValue } = props;

  const clientAuthenticationsOptions = [
    {
      id: clientAuth.None,
      label: 'None',
      'data-test-subj': 'clientAuthNoneRadioButton',
    },
    {
      id: clientAuth.Required,
      label: 'Required',
      'data-test-subj': 'clientAuthUsernamePasswordRadioButton',
    },
    {
      id: clientAuth.Optional,
      label: 'Optional',
      'data-test-subj': 'clientAuthSSLRadioButton',
    },
  ];
  return (
    <>
      <EuiAccordion
        id="advancedSSLOptions"
        data-test-subj="advancedSSLOptionsButton"
        buttonClassName="ingest-active-button"
        buttonContent={
          <div>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.fleet.fleetServerHosts.SSLOptionsToggleLabel"
                  defaultMessage="Authentication"
                />
              </h3>
            </EuiTitle>
            <EuiText size="s">
              <p>
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.fleet.fleetServerHosts.SSLOptionsToggleLabel"
                    defaultMessage="Set up a TLS secure connection"
                  />
                </EuiTextColor>
              </p>
            </EuiText>
          </div>
        }
      >
        <EuiSpacer size="s" />
        <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
          <MultiRowInput
            placeholder={i18n.translate(
              'xpack.fleet.settings.fleetServerHosts.sslCertificateAuthoritiesInputPlaceholder',
              {
                defaultMessage: 'Specify certificate authority',
              }
            )}
            label={i18n.translate(
              'xpack.fleet.settings.fleetServerHosts.sslCertificateAuthoritiesInputLabel',
              {
                defaultMessage: 'Server SSL certificate authorities',
              }
            )}
            multiline={true}
            sortable={false}
            {...inputs.sslCertificateAuthoritiesInput.props}
          />
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHosts.sslCertificateInputLabel"
                defaultMessage="Client SSL certificate"
              />
            }
            {...inputs.sslCertificateInput.formRowProps}
          >
            <EuiTextArea
              fullWidth
              rows={5}
              {...inputs.sslCertificateInput.props}
              placeholder={i18n.translate(
                'xpack.fleet.settings.fleetServerHosts.sslCertificateInputPlaceholder',
                {
                  defaultMessage: 'Specify SSL certificate',
                }
              )}
            />
          </EuiFormRow>
          {!useSecretsStorage ? (
            <SecretFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.fleetServerHosts.sslKeyInputLabel"
                  defaultMessage="Client SSL certificate key"
                />
              }
              {...inputs.sslKeyInput.formRowProps}
              useSecretsStorage={useSecretsStorage}
              onToggleSecretStorage={onToggleSecretAndClearValue}
              disabled={!useSecretsStorage}
            >
              <EuiTextArea
                fullWidth
                rows={5}
                {...inputs.sslKeyInput.props}
                placeholder={i18n.translate(
                  'xpack.fleet.settings.fleetServerHosts.sslKeyInputPlaceholder',
                  {
                    defaultMessage: 'Specify certificate key',
                  }
                )}
              />
            </SecretFormRow>
          ) : (
            <SecretFormRow
              fullWidth
              title={i18n.translate(
                'xpack.fleet.settings.fleetServerHosts.sslKeySecretInputTitle',
                {
                  defaultMessage: 'Client SSL certificate key',
                }
              )}
              {...inputs.sslKeySecretInput.formRowProps}
              useSecretsStorage={useSecretsStorage}
              isConvertedToSecret={isConvertedToSecret.sslKey}
              onToggleSecretStorage={onToggleSecretAndClearValue}
              cancelEdit={inputs.sslKeySecretInput.cancelEdit}
            >
              <EuiTextArea
                fullWidth
                rows={5}
                {...inputs.sslKeySecretInput.props}
                data-test-subj="sslKeySecretInput"
                placeholder={i18n.translate(
                  'xpack.fleet.settings.fleetServerHosts.sslKeySecretInputPlaceholder',
                  {
                    defaultMessage: 'Specify certificate key',
                  }
                )}
              />
            </SecretFormRow>
          )}
          <MultiRowInput
            placeholder={i18n.translate(
              'xpack.fleet.settings.fleetServerHosts.sslEsCertificateAuthoritiesInputPlaceholder',
              {
                defaultMessage: 'Specify Elasticsearch certificate authority',
              }
            )}
            label={i18n.translate(
              'xpack.fleet.settings.fleetServerHosts.sslEsCertificateAuthoritiesInputLabel',
              {
                defaultMessage: 'Elasticsearch certificate authorities',
              }
            )}
            multiline={true}
            sortable={false}
            {...inputs.sslEsCertificateAuthoritiesInput.props}
          />
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHosts.sslEsCertificateInputLabel"
                defaultMessage="SSL certificate for Elasticsearch"
              />
            }
            {...inputs.sslEsCertificateInput.formRowProps}
          >
            <EuiTextArea
              fullWidth
              rows={5}
              {...inputs.sslEsCertificateInput.props}
              placeholder={i18n.translate(
                'xpack.fleet.settings.fleetServerHosts.sslEsCertificateInputPlaceholder',
                {
                  defaultMessage: 'Specify Elasticsearch SSL certificate',
                }
              )}
            />
          </EuiFormRow>
          {!useSecretsStorage ? (
            <SecretFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.fleetServerHosts.sslEsKeyInputLabel"
                  defaultMessage="SSL certificate key for Elasticsearch"
                />
              }
              {...inputs.sslESKeyInput.formRowProps}
              useSecretsStorage={useSecretsStorage}
              onToggleSecretStorage={onToggleSecretAndClearValue}
              disabled={!useSecretsStorage}
            >
              <EuiTextArea
                fullWidth
                rows={5}
                {...inputs.sslESKeyInput.props}
                placeholder={i18n.translate(
                  'xpack.fleet.settings.fleetServerHosts.sslKeyInputPlaceholder',
                  {
                    defaultMessage: 'Specify certificate key',
                  }
                )}
              />
            </SecretFormRow>
          ) : (
            <SecretFormRow
              fullWidth
              title={i18n.translate(
                'xpack.fleet.settings.fleetServerHosts.sslEsKeySecretInputTitle',
                {
                  defaultMessage: 'SSL certificate key for Elasticsearch',
                }
              )}
              {...inputs.sslESKeySecretInput.formRowProps}
              useSecretsStorage={useSecretsStorage}
              isConvertedToSecret={isConvertedToSecret.sslKey}
              onToggleSecretStorage={onToggleSecretAndClearValue}
              cancelEdit={inputs.sslESKeySecretInput.cancelEdit}
            >
              <EuiTextArea
                fullWidth
                rows={5}
                {...inputs.sslESKeySecretInput.props}
                data-test-subj="sslESKeySecretInput"
                placeholder={i18n.translate(
                  'xpack.fleet.settings.fleetServerHosts.sslESKeySecretInputPlaceholder',
                  {
                    defaultMessage: 'Specify certificate key',
                  }
                )}
              />
            </SecretFormRow>
          )}
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHosts.clientAuthenticationInputLabel"
                defaultMessage="Client auth"
              />
            }
          >
            <EuiRadioGroup
              style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 30 }}
              data-test-subj={'fleetServerHosts.clientAuthenticationRadioInput'}
              options={clientAuthenticationsOptions}
              compressed
              {...inputs.sslClientAuthInput.props}
            />
          </EuiFormRow>
        </EuiPanel>
      </EuiAccordion>
    </>
  );
};
