/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useEffect } from 'react';
import useInterval from 'react-use/lib/useInterval';

import { SYSTEM_INDICES_MIGRATION_POLL_INTERVAL_MS } from '../../../../../common/constants';
import type { ResponseError } from '../../../../../common/types';
import { GlobalFlyout } from '../../../../shared_imports';
import { useAppContext } from '../../../app_context';
import { SystemIndicesFlyout, SystemIndicesFlyoutProps } from './flyout';

const FLYOUT_ID = 'migrateSystemIndicesFlyout';
const { useGlobalFlyout } = GlobalFlyout;

export type StatusType = 'idle' | 'error' | 'started';
interface MigrationStatus {
  statusType: StatusType;
  error?: ResponseError;
}

export const useMigrateSystemIndices = () => {
  const {
    services: { api },
  } = useAppContext();

  const [showFlyout, setShowFlyout] = useState(false);

  const [startMigrationStatus, setStartMigrationStatus] = useState<MigrationStatus>({
    statusType: 'idle',
  });

  const { data, error, isLoading, resendRequest, isInitialRequest } =
    api.useLoadSystemIndicesMigrationStatus();
  const isInProgress = data?.migration_status === 'IN_PROGRESS';

  // We only want to poll for the status while the migration process is in progress.
  useInterval(resendRequest, isInProgress ? SYSTEM_INDICES_MIGRATION_POLL_INTERVAL_MS : null);

  const { addContent: addContentToGlobalFlyout, removeContent: removeContentFromGlobalFlyout } =
    useGlobalFlyout();

  const closeFlyout = useCallback(() => {
    setShowFlyout(false);
    removeContentFromGlobalFlyout(FLYOUT_ID);
  }, [removeContentFromGlobalFlyout]);

  useEffect(() => {
    if (showFlyout) {
      addContentToGlobalFlyout<SystemIndicesFlyoutProps>({
        id: FLYOUT_ID,
        Component: SystemIndicesFlyout,
        props: {
          data: data!,
          closeFlyout,
        },
        flyoutProps: {
          onClose: closeFlyout,
        },
      });
    }
  }, [addContentToGlobalFlyout, data, showFlyout, closeFlyout]);

  const beginSystemIndicesMigration = useCallback(async () => {
    const { error: startMigrationError } = await api.migrateSystemIndices();

    setStartMigrationStatus({
      statusType: startMigrationError ? 'error' : 'started',
      error: startMigrationError ?? undefined,
    });

    if (!startMigrationError) {
      resendRequest();
    }
  }, [api, resendRequest]);

  return {
    setShowFlyout,
    startMigrationStatus,
    beginSystemIndicesMigration,
    migrationStatus: {
      data,
      error,
      isLoading,
      resendRequest,
      isInitialRequest,
    },
  };
};
