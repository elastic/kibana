/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiFieldNumber, EuiFieldText, EuiFormRow, EuiLink } from '@elastic/eui';
import { proxySettingsUrl } from '../../../../services/documentation';
import { Props } from './connection_mode';

export const ProxyConnection: FunctionComponent<Props> = (props) => {
  const { fields, fieldsErrors, areErrorsVisible, onFieldsChange } = props;
  const { proxyAddress, serverName, proxySocketConnections } = fields;
  const { proxyAddress: proxyAddressError } = fieldsErrors;

  return (
    <>
      <>
        <EuiFormRow
          data-test-subj="remoteClusterFormProxyAddressFormRow"
          label={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.fieldProxyAddressLabel"
              defaultMessage="Proxy address"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.fieldProxyAddressHelpText"
              defaultMessage="The address to use for remote connections."
            />
          }
          isInvalid={Boolean(areErrorsVisible && proxyAddressError)}
          error={proxyAddressError}
          fullWidth
        >
          <EuiFieldText
            value={proxyAddress}
            placeholder={i18n.translate(
              'xpack.remoteClusters.remoteClusterForm.fieldProxyAddressPlaceholder',
              {
                defaultMessage: 'host:port',
              }
            )}
            onChange={(e) => onFieldsChange({ proxyAddress: e.target.value })}
            isInvalid={Boolean(areErrorsVisible && proxyAddressError)}
            data-test-subj="remoteClusterFormProxyAddressInput"
            fullWidth
          />
        </EuiFormRow>

        <EuiFormRow
          data-test-subj="remoteClusterFormServerNameFormRow"
          label={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.fieldServerNameOptionalLabel"
              defaultMessage="Server name (optional)"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.fieldServerNameHelpText"
              defaultMessage="A string sent in the server_name field of the TLS Server Name Indication extension if TLS is enabled. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink href={proxySettingsUrl} target="_blank">
                    <FormattedMessage
                      id="xpack.remoteClusters.remoteClusterForm.fieldServerNameHelpText.learnMoreLinkLabel"
                      defaultMessage="Learn more."
                    />
                  </EuiLink>
                ),
              }}
            />
          }
          fullWidth
        >
          <EuiFieldText
            value={serverName}
            onChange={(e) => onFieldsChange({ serverName: e.target.value })}
            fullWidth
          />
        </EuiFormRow>
      </>

      <EuiFormRow
        data-test-subj="remoteClusterFormProxySocketConnectionsFormRow"
        label={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.fieldProxySocketConnectionsLabel"
            defaultMessage="Socket connections"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.fieldSocketConnectionsHelpText"
            defaultMessage="The number of connections to open per remote cluster."
          />
        }
        fullWidth
      >
        <EuiFieldNumber
          value={proxySocketConnections || ''}
          onChange={(e) => onFieldsChange({ proxySocketConnections: Number(e.target.value) })}
          fullWidth
        />
      </EuiFormRow>
    </>
  );
};
