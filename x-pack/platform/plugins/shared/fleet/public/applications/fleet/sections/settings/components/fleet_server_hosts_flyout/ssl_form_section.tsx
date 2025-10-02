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
                defaultMessage:
                  'Specify the CA certificate(s) that signed the Elastic Agent client certificates connecting to this Fleet Server. Fleet Server trusts these CAs when verifying incoming connections.',
              }
            )}
            label={i18n.translate(
              'xpack.fleet.settings.fleetServerHosts.sslCertificateAuthoritiesInputLabel',
              {
                defaultMessage: 'Fleet Server > Elastic Agents certificate authorities',
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
                defaultMessage="Fleet Server > SSL server certificate"
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
                  defaultMessage:
                    'Specify the Fleet Server SSL certificate used to secure communication with incoming Elastic Agent connections.',
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
                  defaultMessage="Fleet Server > SSL server private key"
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
                    defaultMessage:
                      'Specify the Fleet Server SSL key used to secure communication with incoming Elastic Agent connections.',
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
                  defaultMessage: 'Fleet Server > SSL server private key',
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
                    defaultMessage:
                      'Specify the Fleet Server SSL key used to secure communication with incoming Elastic Agent connections.',
                  }
                )}
              />
            </SecretFormRow>
          )}
          <MultiRowInput
            placeholder={i18n.translate(
              'xpack.fleet.settings.fleetServerHosts.sslEsCertificateAuthoritiesInputPlaceholder',
              {
                defaultMessage:
                  'Specify the Elasticsearch CA certificate(s) that Fleet Server should trust when connecting to Elasticsearch.',
              }
            )}
            label={i18n.translate(
              'xpack.fleet.settings.fleetServerHosts.sslEsCertificateAuthoritiesInputLabel',
              {
                defaultMessage: 'Fleet Server > Elasticsearch certificate authorities',
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
                defaultMessage="Fleet Server > SSL client certificate for Elasticsearch"
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
                  defaultMessage:
                    'Specify the SSL client certificate that the Fleet Server should use when connecting to Elasticsearch. Only needed for mTLS between Fleet Server and Elasticsearch.',
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
                  defaultMessage="Fleet Server > SSL private key for Elasticsearch"
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
                    defaultMessage:
                      'Specify the SSL key that the Fleet Server should use when connecting to Elasticsearch. Only needed for mTLS between Fleet Server and Elasticsearch.',
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
                  defaultMessage: 'Fleet Server > SSL private key for Elasticsearch',
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
                    defaultMessage:
                      'Specify the SSL key that the Fleet Server should use when connecting to Elasticsearch. Only needed for mTLS between Fleet Server and Elasticsearch.',
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
              name="clientAuth"
              {...inputs.sslClientAuthInput.props}
            />
          </EuiFormRow>
        </EuiPanel>
      </EuiAccordion>
    </>
  );
};
