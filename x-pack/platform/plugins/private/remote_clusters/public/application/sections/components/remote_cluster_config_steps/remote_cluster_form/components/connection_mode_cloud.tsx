/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiDescribedFormGroup,
  EuiTitle,
  EuiFormRow,
  EuiSwitch,
  EuiSpacer,
  EuiFieldText,
  EuiLink,
  EuiFieldNumber,
  EuiCode,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { proxySettingsUrl } from '../../../../../services/documentation';

import { ClusterErrors } from '../validators';
import { FormFields } from '../remote_cluster_form';

export interface Props {
  fields: FormFields;
  onFieldsChange: (fields: Partial<FormFields>) => void;
  fieldsErrors: ClusterErrors;
  areErrorsVisible: boolean;
}

export const ConnectionModeCloud: FunctionComponent<Props> = (props) => {
  const { fields, fieldsErrors, areErrorsVisible, onFieldsChange } = props;
  const { cloudRemoteAddress, serverName, proxySocketConnections, cloudAdvancedOptionsEnabled } =
    fields;
  const { cloudRemoteAddress: cloudRemoteAddressError } = fieldsErrors;

  return (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.sectionModeTitle"
              defaultMessage="Connection mode"
            />
          </h2>
        </EuiTitle>
      }
      description={
        <>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.sectionModeCloudDescription"
              defaultMessage="Configure how to connect to the remote cluster."
            />
          </EuiText>
          <EuiSpacer size="l" />
          <EuiFormRow fullWidth>
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.advancedOptionsToggleLabel"
                  defaultMessage="Configure advanced options"
                />
              }
              checked={cloudAdvancedOptionsEnabled}
              data-test-subj="remoteClusterFormCloudAdvancedOptionsToggle"
              onChange={(e) => onFieldsChange({ cloudAdvancedOptionsEnabled: e.target.checked })}
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
        </>
      }
      fullWidth
    >
      <EuiFormRow
        data-test-subj="remoteClusterFormRemoteAddressFormRow"
        label={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.fieldRemoteAddressLabel"
            defaultMessage="Remote address"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.fieldRemoteAddressHelpText"
            defaultMessage="When no port is specified, the default {default_port} port is used."
            values={{
              default_port: <EuiCode>{'9400'}</EuiCode>,
            }}
          />
        }
        isInvalid={Boolean(areErrorsVisible && cloudRemoteAddressError)}
        error={cloudRemoteAddressError}
        fullWidth
      >
        <EuiFieldText
          value={cloudRemoteAddress}
          placeholder={i18n.translate(
            'xpack.remoteClusters.remoteClusterForm.fieldRemoteAddressPlaceholder',
            {
              defaultMessage: 'hostname:port',
            }
          )}
          onChange={(e) => onFieldsChange({ cloudRemoteAddress: e.target.value })}
          isInvalid={Boolean(areErrorsVisible && cloudRemoteAddressError)}
          data-test-subj="remoteClusterFormRemoteAddressInput"
          fullWidth
        />
      </EuiFormRow>

      {cloudAdvancedOptionsEnabled && (
        <>
          <EuiFormRow
            data-test-subj="remoteClusterFormTLSServerNameFormRow"
            label={
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.fieldTLSServerNameLabel"
                defaultMessage="TLS server name (optional)"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.fieldTLSServerNameHelpText"
                defaultMessage="If the remote cluster certificate has a different server name, specify it here. {learnMoreLink}"
                values={{
                  learnMoreLink: (
                    <EuiLink href={proxySettingsUrl} target="_blank">
                      <FormattedMessage
                        id="xpack.remoteClusters.remoteClusterForm.fieldTLSServerNameHelpText.learnMoreLinkLabel"
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
      )}
    </EuiDescribedFormGroup>
  );
};
