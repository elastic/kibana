/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, createContext, useContext } from 'react';
import { ApiService } from '../../../../lib/api';

import { useSnapshotState, SnapshotState } from './use_snapshot_state';

export interface MlSnapshotContext {
  snapshotState: SnapshotState;
  mlUpgradeModeEnabled: boolean;
  upgradeSnapshot: () => Promise<void>;
  deleteSnapshot: () => Promise<void>;
}

const MlSnapshotsContext = createContext<MlSnapshotContext | undefined>(undefined);

export const useMlSnapshotContext = () => {
  const context = useContext(MlSnapshotsContext);
  if (context === undefined) {
    throw new Error('useMlSnapshotContext must be used within a <MlSnapshotsStatusProvider />');
  }
  return context;
};

interface Props {
  api: ApiService;
  children: React.ReactNode;
  snapshotId: string;
  jobId: string;
  mlUpgradeModeEnabled: boolean;
}

export const MlSnapshotsStatusProvider: React.FunctionComponent<Props> = ({
  api,
  snapshotId,
  jobId,
  mlUpgradeModeEnabled,
  children,
}) => {
  const { updateSnapshotStatus, snapshotState, upgradeSnapshot, deleteSnapshot } = useSnapshotState(
    {
      jobId,
      snapshotId,
      api,
    }
  );

  useEffect(() => {
    updateSnapshotStatus();
  }, [updateSnapshotStatus]);

  return (
    <MlSnapshotsContext.Provider
      value={{
        snapshotState,
        upgradeSnapshot,
        deleteSnapshot,
        mlUpgradeModeEnabled,
      }}
    >
      {children}
    </MlSnapshotsContext.Provider>
  );
};
