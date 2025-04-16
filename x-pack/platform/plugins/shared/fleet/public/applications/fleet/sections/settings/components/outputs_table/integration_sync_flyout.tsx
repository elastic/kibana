/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import type { GetRemoteSyncedIntegrationsStatusResponse } from '../../../../../../../common/types';

import { IntegrationStatus } from './integration_status';

interface Props {
  onClose: () => void;
  syncedIntegrationsStatus?: GetRemoteSyncedIntegrationsStatusResponse;
  outputName: string;
}

export const IntegrationSyncFlyout: React.FunctionComponent<Props> = ({
  onClose,
  syncedIntegrationsStatus,
  outputName,
}) => {
  const [status, setStatus] = useState<GetRemoteSyncedIntegrationsStatusResponse | undefined>(
    undefined
  );

  useEffect(() => {
    if (syncedIntegrationsStatus) {
      setStatus(syncedIntegrationsStatus);
    }
  }, [syncedIntegrationsStatus]);

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.fleet.integrationSyncFlyout.titleText"
              defaultMessage="Integration syncing status"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          <FormattedMessage
            id="xpack.fleet.integrationSyncFlyout.headerText"
            defaultMessage="You're viewing sync activity for {outputName}. Check overall progress and view individual sync statuses from custom assets."
            values={{
              outputName,
            }}
          />
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {status?.error && (
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
          >
            <EuiText size="s">{status?.error}</EuiText>
          </EuiCallOut>
        )}
        <EuiFlexGroup direction="column" gutterSize="m">
          {(status?.integrations ?? []).map((integration, index) => {
            const testSubj = (integration.package_name ?? 'integration') + '-' + index;
            const customAssets = Object.values(status?.custom_assets ?? {}).filter(
              (asset) => asset.package_name === integration.package_name
            );
            return (
              <EuiFlexItem grow={false} key={integration.package_name} data-test-subj={testSubj}>
                <IntegrationStatus
                  data-test-subj={`${testSubj}-accordion`}
                  integration={integration}
                  customAssets={customAssets}
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
};
