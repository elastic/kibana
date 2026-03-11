/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';

import { SyncStatus, type Output } from '../../../../../../../common/types';

import { useGetRemoteSyncedIntegrationsStatusQuery } from '../../../../hooks';

import { IntegrationSyncFlyout } from './integration_sync_flyout';
import { IntegrationStatusBadge } from './integration_status_badge';

interface Props {
  output: Output;
}

export function getIntegrationStatus(statuses: SyncStatus[]): SyncStatus {
  return statuses.some((current) => current === SyncStatus.FAILED)
    ? SyncStatus.FAILED
    : statuses.some((current) => current === SyncStatus.WARNING)
    ? SyncStatus.WARNING
    : statuses.some((current) => current === SyncStatus.SYNCHRONIZING)
    ? SyncStatus.SYNCHRONIZING
    : SyncStatus.COMPLETED;
}

export const IntegrationSyncStatus: React.FunctionComponent<Props> = memo(({ output }) => {
  const { data: syncedIntegrationsStatus, error } = useGetRemoteSyncedIntegrationsStatusQuery(
    output.id,
    { enabled: output.type === 'remote_elasticsearch' && output.sync_integrations }
  );

  const [showStatusFlyout, setShowStatusFlyout] = useState(false);

  const status = useMemo(() => {
    if (output.type !== 'remote_elasticsearch') {
      return 'NA';
    }
    if (!output.sync_integrations) {
      return 'DISABLED';
    }
    if (!error && !syncedIntegrationsStatus) {
      return 'SYNCHRONIZING';
    }
    const installedSyncedIntegrations = (syncedIntegrationsStatus?.integrations ?? []).filter(
      (integration) =>
        !(
          integration.install_status?.main === 'not_installed' &&
          integration.install_status?.remote === 'not_installed'
        )
    );
    const statuses = [
      ...(installedSyncedIntegrations.map((integration) => integration.sync_status) || []),
      ...Object.values(syncedIntegrationsStatus?.custom_assets ?? {}).map(
        (asset) => asset.sync_status
      ),
    ];
    const integrationStatus = getIntegrationStatus(statuses).toUpperCase();

    const newStatus =
      (error as any)?.message || syncedIntegrationsStatus?.error ? 'FAILED' : integrationStatus;

    return newStatus;
  }, [output, syncedIntegrationsStatus, error]);

  const onClick = () => {
    setShowStatusFlyout(true);
  };

  return (
    <>
      {
        <IntegrationStatusBadge
          status={status}
          onClick={onClick}
          onClickAriaLabel={'Show details'}
        />
      }
      {showStatusFlyout && (
        <IntegrationSyncFlyout
          onClose={() => setShowStatusFlyout(false)}
          syncedIntegrationsStatus={
            error
              ? {
                  integrations: [],
                  error: (error as any).message,
                }
              : syncedIntegrationsStatus
          }
          outputName={output.name}
          syncUninstalledIntegrations={
            output.type === 'remote_elasticsearch' && output?.sync_uninstalled_integrations
          }
        />
      )}
    </>
  );
});
