/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiForm,
  EuiSpacer,
} from '@elastic/eui';

import type { FleetProxy } from '../../../../types';
import { MAX_FLYOUT_WIDTH } from '../../../../constants';
import { TextInput, TextAreaInput } from '../form';

import { ProxyWarning } from '../fleet_proxies_table/proxy_warning';

import { useFleetProxyForm } from './use_fleet_proxy_form';

export interface FleetProxyFlyoutProps {
  onClose: () => void;
  fleetProxy?: FleetProxy;
}

export const FleetProxyFlyout: React.FunctionComponent<FleetProxyFlyoutProps> = ({
  onClose,
  fleetProxy,
}) => {
  const form = useFleetProxyForm(fleetProxy, onClose);
  const { inputs } = form;

  return (
    <EuiFlyout onClose={onClose} maxWidth={MAX_FLYOUT_WIDTH}>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="m">
          <h2>
            {fleetProxy ? (
              <FormattedMessage
                id="xpack.fleet.settings.fleetProxyFlyout.editTitle"
                defaultMessage="Edit Proxy"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.settings.fleetProxyFlyout.addTitle"
                defaultMessage="Add Proxy"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ProxyWarning />
        <EuiSpacer size="m" />
        <EuiForm onSubmit={form.submit}>
          <TextInput
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetProxyFlyout.nameInputLabel"
                defaultMessage="Name"
              />
            }
            inputProps={inputs.nameInput}
            data-test-subj="fleetProxyFlyout.nameInput"
            placeholder={i18n.translate(
              'xpack.fleet.settings.fleetProxyFlyout.nameInputPlaceholder',
              {
                defaultMessage: 'Specify name',
              }
            )}
          />
          <TextInput
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetProxyFlyout.urlInputLabel"
                defaultMessage="Proxy Url"
              />
            }
            dataTestSubj="fleetProxyFlyout.urlInput"
            inputProps={inputs.urlInput}
            placeholder={i18n.translate(
              'xpack.fleet.settings.fleetProxyFlyout.urlInputPlaceholder',
              { defaultMessage: 'Specify proxy url' }
            )}
          />
          <TextAreaInput
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetProxyFlyout.proxyHeadersLabel"
                defaultMessage="Proxy headers"
              />
            }
            dataTestSubj="fleetProxyFlyout.proxyHeadersInput"
            inputProps={inputs.proxyHeadersInput}
            placeholder={i18n.translate(
              'xpack.fleet.settings.fleetProxyFlyout.proxyHeadersPlaceholder',
              { defaultMessage: 'Specify proxy headers' }
            )}
          />
          <TextInput
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetProxyFlyout.certificateAuthoritiesLabel"
                defaultMessage="Certificate authorities"
              />
            }
            dataTestSubj="fleetProxyFlyout.certificateAuthoritiesInput"
            inputProps={inputs.certificateAuthoritiesInput}
            placeholder={i18n.translate(
              'xpack.fleet.settings.fleetProxyFlyout.certificateAuthoritiesPlaceholder',
              { defaultMessage: 'Specify certificate authorities' }
            )}
          />
          <TextInput
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetProxyFlyout.certificateLabel"
                defaultMessage="Certificate"
              />
            }
            dataTestSubj="fleetProxyFlyout.certificateInput"
            inputProps={inputs.certificateInput}
            placeholder={i18n.translate(
              'xpack.fleet.settings.fleetProxyFlyout.certificatePlaceholder',
              { defaultMessage: 'Specify certificate' }
            )}
          />
          <TextInput
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetProxyFlyout.certificateKeyLabel"
                defaultMessage="Certificate key"
              />
            }
            dataTestSubj="fleetProxyFlyout.certificateKeyInput"
            inputProps={inputs.certificateKeyInput}
            placeholder={i18n.translate(
              'xpack.fleet.settings.fleetProxyFlyout.certificateKeyPlaceholder',
              { defaultMessage: 'Specify certificate key' }
            )}
          />
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => onClose()} flush="left">
              <FormattedMessage
                id="xpack.fleet.settings.fleetProxyFlyout.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={form.isLoading}
              isDisabled={form.isDisabled}
              onClick={form.submit}
              data-test-subj="saveApplySettingsBtn"
            >
              <FormattedMessage
                id="xpack.fleet.settings.fleetProxyFlyout.saveButton"
                defaultMessage="Save and apply settings"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
