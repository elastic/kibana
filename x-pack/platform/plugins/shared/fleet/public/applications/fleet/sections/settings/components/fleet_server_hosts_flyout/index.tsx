/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiText,
  EuiLink,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiSwitch,
  EuiComboBox,
  EuiCallOut,
  EuiFieldText,
} from '@elastic/eui';

import { MultiRowInput } from '../multi_row_input';
import { MAX_FLYOUT_WIDTH } from '../../../../constants';
import { useStartServices } from '../../../../hooks';
import type { FleetServerHost, FleetProxy } from '../../../../types';
import { TextInput } from '../form';
import { ProxyWarning } from '../fleet_proxies_table/proxy_warning';

import { useFleetServerHostsForm } from './use_fleet_server_host_form';

export interface FleetServerHostsFlyoutProps {
  onClose: () => void;
  fleetServerHost?: FleetServerHost;
  defaultFleetServerHost?: FleetServerHost;
  proxies: FleetProxy[];
}

export const FleetServerHostsFlyout: React.FunctionComponent<FleetServerHostsFlyoutProps> = ({
  onClose,
  fleetServerHost,
  defaultFleetServerHost,
  proxies,
}) => {
  const { docLinks, cloud } = useStartServices();

  const form = useFleetServerHostsForm(fleetServerHost, onClose, defaultFleetServerHost);
  const { inputs } = form;

  const proxiesOptions = useMemo(
    () => proxies.map((proxy) => ({ value: proxy.id, label: proxy.name })),
    [proxies]
  );

  return (
    <EuiFlyout onClose={onClose} maxWidth={MAX_FLYOUT_WIDTH}>
      <EuiFlyoutHeader hasBorder={true}>
        <>
          <EuiTitle size="m">
            <h2>
              {fleetServerHost ? (
                <FormattedMessage
                  id="xpack.fleet.settings.fleetServerHostsFlyout.editTitle"
                  defaultMessage="Edit Fleet Server"
                />
              ) : (
                <FormattedMessage
                  id="xpack.fleet.settings.fleetServerHostsFlyout.addTitle"
                  defaultMessage="Add Fleet Server"
                />
              )}
            </h2>
          </EuiTitle>
          {!fleetServerHost && (
            <>
              <EuiSpacer size="m" />
              <EuiText color="subdued">
                <FormattedMessage
                  id="xpack.fleet.settings.fleetServerHostsFlyout.serverlessInfoText"
                  defaultMessage="You may create another Fleet Server definition reachable via a proxy. In context of the serverless project, Fleet Service is managed by Elastic. Creation of a new one is therefore not permitted."
                />
              </EuiText>
            </>
          )}
        </>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {fleetServerHost && (
          <EuiCallOut
            size="m"
            color="warning"
            iconType="warning"
            title={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.warningCalloutTitle"
                defaultMessage="Changing these settings can break your agent connections"
              />
            }
          >
            <FormattedMessage
              id="xpack.fleet.settings.fleetServerHostsFlyout.warningCalloutDescription"
              defaultMessage="Invalid settings can break the connection between Elastic Agent and Fleet Server. If this happens, you will need to re-enroll your agents."
            />
          </EuiCallOut>
        )}
        <EuiSpacer size="m" />
        <EuiForm onSubmit={form.submit}>
          <TextInput
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.nameInputLabel"
                defaultMessage="Name"
              />
            }
            inputProps={inputs.nameInput}
            dataTestSubj="fleetServerHostsFlyout.nameInput"
            placeholder={i18n.translate(
              'xpack.fleet.settings.fleetServerHostsFlyout.nameInputPlaceholder',
              { defaultMessage: 'Specify name' }
            )}
          />
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.hostUrlLabel"
                defaultMessage="URL"
              />
            }
          >
            <>
              {!cloud?.isServerlessEnabled && (
                <>
                  <EuiText color="subdued" size="relative">
                    <FormattedMessage
                      id="xpack.fleet.settings.fleetServerHostsFlyout.description"
                      defaultMessage="Specify multiple URLs to scale out your deployment and provide automatic failover. If multiple URLs exist, Fleet shows the first provided URL for enrollment purposes. Enrolled Elastic Agents will connect to the URLs in round robin order until they connect successfully. For more information, see the {link} ."
                      values={{
                        link: (
                          <EuiLink
                            href={docLinks.links.fleet.settingsFleetServerHostSettings}
                            target="_blank"
                            external
                          >
                            <FormattedMessage
                              id="xpack.fleet.settings.fleetServerHostsFlyout.userGuideLink"
                              defaultMessage="Fleet and Elastic Agent Guide"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  </EuiText>
                  <EuiSpacer size="m" />
                </>
              )}
              <MultiRowInput
                {...inputs.hostUrlsInput.props}
                id="fleet-server-inputs"
                placeholder={i18n.translate(
                  'xpack.fleet.settings.fleetServerHostsFlyout.fleetServerHostsInputPlaceholder',
                  {
                    defaultMessage: 'Specify host URL',
                  }
                )}
                isUrl
                helpText={
                  cloud?.isServerlessEnabled && (
                    <FormattedMessage
                      id="xpack.fleet.settings.fleetServerHostsFlyout.serverlessHostUrlsHelpText"
                      defaultMessage="Custom host URLs are not allowed in serverless."
                    />
                  )
                }
              />
            </>
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.proxyIdLabel"
                defaultMessage="Proxy"
              />
            }
          >
            <>
              <EuiComboBox
                fullWidth
                data-test-subj="fleetServerHostsFlyout.proxyIdInput"
                {...inputs.proxyIdInput.props}
                onChange={(options) => inputs.proxyIdInput.setValue(options?.[0]?.value ?? '')}
                selectedOptions={
                  inputs.proxyIdInput.value !== ''
                    ? proxiesOptions.filter((option) => option.value === inputs.proxyIdInput.value)
                    : []
                }
                options={proxiesOptions}
                singleSelection={{ asPlainText: true }}
                isDisabled={inputs.proxyIdInput.props.disabled}
                isClearable={true}
                placeholder={i18n.translate(
                  'xpack.fleet.settings.fleetServerHostsFlyout.proxyIdPlaceholder',
                  {
                    defaultMessage: 'Select proxy',
                  }
                )}
              />
              <EuiSpacer size="xs" />
              <ProxyWarning />
            </>
          </EuiFormRow>
          <EuiFormRow fullWidth {...inputs.isDefaultInput.formRowProps}>
            <EuiSwitch
              data-test-subj="fleetServerHostsFlyout.isDefaultSwitch"
              {...inputs.isDefaultInput.props}
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.fleetServerHostsFlyout.defaultOutputSwitchLabel"
                  defaultMessage="Make this Fleet server the default one."
                />
              }
            />
          </EuiFormRow>
          <EuiSpacer size="l" />
          <EuiFormRow
            fullWidth
            {...inputs.certificateInput.formRowProps}
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.certificateLabel"
                defaultMessage="Client SSL Certificate"
              />
            }
          >
            <EuiFieldText
              fullWidth
              data-test-subj="fleetServerHostsFlyout.certificateInput"
              placeholder={i18n.translate(
                'xpack.fleet.settings.fleetServerHostsFlyout.certificatePlaceholder',
                { defaultMessage: 'Specify ssl certificate' }
              )}
              {...inputs.certificateInput.props}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            {...inputs.certificateKeyInput.formRowProps}
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.certificateKeyLabel"
                defaultMessage="Client SSL Certificate key"
              />
            }
          >
            <EuiFieldText
              fullWidth
              data-test-subj="fleetServerHostsFlyout.certificateKeyInput"
              placeholder={i18n.translate(
                'xpack.fleet.settings.fleetServerHostsFlyout.certificateKeyPlaceholder',
                { defaultMessage: 'Specify SSL certificate key' }
              )}
              {...inputs.certificateKeyInput.props}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            {...inputs.certificateAuthoritiesInput.formRowProps}
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.certificateAuthoritiesLabel"
                defaultMessage="Server SSL certificate authorities (optional)"
              />
            }
          >
            <EuiFieldText
              fullWidth
              data-test-subj="fleetServerHostsFlyout.certificateAuthoritiesInput"
              placeholder={i18n.translate(
                'xpack.fleet.settings.fleetServerHostsFlyout.certificateAuthoritiesPlaceholder',
                { defaultMessage: 'Specify certificate authorities' }
              )}
              {...inputs.certificateAuthoritiesInput.props}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            {...inputs.esCertificateInput.formRowProps}
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.EScertificateLabel"
                defaultMessage="SSL certificate for Elasticsearch"
              />
            }
          >
            <EuiFieldText
              fullWidth
              data-test-subj="fleetServerHostsFlyout.esCertificateInput"
              placeholder={i18n.translate(
                'xpack.fleet.settings.fleetServerHostsFlyout.esCertificatePlaceholder',
                { defaultMessage: 'Specify Elasticsearch SSL certificate' }
              )}
              {...inputs.esCertificateInput.props}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            {...inputs.esCertificateKeyInput.formRowProps}
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.esCertificateKeyLabel"
                defaultMessage="SSL certificate key for Elasticsearch"
              />
            }
          >
            <EuiFieldText
              fullWidth
              data-test-subj="fleetServerHostsFlyout.esCertificateKeyInput"
              placeholder={i18n.translate(
                'xpack.fleet.settings.fleetServerHostsFlyout.esCertificateKeyPlaceholder',
                { defaultMessage: 'Specify Elasticsearch SSL certificate key' }
              )}
              {...inputs.esCertificateKeyInput.props}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            {...inputs.esCertificateAuthoritiesInput.formRowProps}
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.esCertificateAuthoritiesLabel"
                defaultMessage="Elasticsearch Certificate Authorities (optional)"
              />
            }
          >
            <EuiFieldText
              fullWidth
              data-test-subj="fleetServerHostsFlyout.esCertificateAuthoritiesInput"
              placeholder={i18n.translate(
                'xpack.fleet.settings.fleetServerHostsFlyout.esCertificateAuthoritiesPlaceholder',
                { defaultMessage: 'Specify Elasticsearch certificate authorities' }
              )}
              {...inputs.esCertificateAuthoritiesInput.props}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => onClose()} flush="left">
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.cancelButtonLabel"
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
                id="xpack.fleet.settings.fleetServerHostsFlyout.saveButton"
                defaultMessage="Save and apply settings"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
