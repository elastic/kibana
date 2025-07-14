/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import type { GetRemoteSyncedIntegrationsStatusResponse } from '../../../../../../../common/types';

import { useStartServices } from '../../../../hooks';

import { IntegrationStatus } from './integration_status';

interface Props {
  onClose: () => void;
  outputName: string;
  syncedIntegrationsStatus?: GetRemoteSyncedIntegrationsStatusResponse;
  syncUninstalledIntegrations?: boolean;
}

export const IntegrationSyncFlyout: React.FunctionComponent<Props> = memo(
  ({ onClose, syncedIntegrationsStatus, outputName, syncUninstalledIntegrations }) => {
    const { docLinks } = useStartServices();
    const flyoutTitleId = useGeneratedHtmlId();
    return (
      <EuiFlyout onClose={onClose} aria-labelledby={flyoutTitleId}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle>
            <h2 id={flyoutTitleId}>
              <FormattedMessage
                id="xpack.fleet.integrationSyncFlyout.titleText"
                defaultMessage="Integration syncing status"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued" size="s" data-test-subj="integrationSyncFlyoutHeaderText">
            <FormattedMessage
              id="xpack.fleet.integrationSyncFlyout.headerText"
              defaultMessage="You're viewing sync activity for {outputName}. Check overall progress and view individual sync statuses from custom assets. {documentationLink}."
              values={{
                outputName,
                documentationLink: (
                  <EuiLink
                    href={`${docLinks.links.fleet.remoteESOoutput}#automatic-integrations-synchronization`}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.fleet.integrationSyncFlyout.documentationLink"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {syncedIntegrationsStatus?.error && (
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.fleet.integrationSyncFlyout.errorTitle"
                  defaultMessage="Error"
                />
              }
              color="danger"
              iconType="error"
              size="s"
              data-test-subj="integrationSyncFlyoutTopErrorCallout"
            >
              <EuiText size="s">{syncedIntegrationsStatus?.error}</EuiText>
            </EuiCallOut>
          )}
          <EuiFlexGroup direction="column" gutterSize="m">
            {(syncedIntegrationsStatus?.integrations ?? [])
              // don't show integrations that were successfully uninstalled
              .filter(
                (integration) =>
                  !(
                    integration.install_status?.main === 'not_installed' &&
                    integration.install_status?.remote === 'not_installed'
                  )
              )
              .map((integration) => {
                const customAssets = Object.values(
                  syncedIntegrationsStatus?.custom_assets ?? {}
                ).filter((asset) => asset.package_name === integration.package_name);
                return (
                  <EuiFlexItem grow={false} key={integration.package_name}>
                    <IntegrationStatus
                      data-test-subj={`${integration.package_name}-accordion`}
                      integration={integration}
                      customAssets={customAssets}
                      syncUninstalledIntegrations={syncUninstalledIntegrations}
                    />
                  </EuiFlexItem>
                );
              })}
          </EuiFlexGroup>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexStart">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose}>
                <FormattedMessage
                  id="xpack.fleet.integrationSyncFlyout.closeFlyoutButtonLabel"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);