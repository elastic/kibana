/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

import { ApiService } from '../../../../lib/api';
import { useMigrationStatus, MigrationState } from './use_migration_state';
import type { DataStreamResolutionType } from '../../../../../../common/types';

export interface MigrationStateContext {
  loadDataStreamMetadata: () => Promise<void>;
  migrationState: MigrationState;

  initMigration: (resolutionType: DataStreamResolutionType) => void;

  // reindex resolution actions
  startReindex: () => Promise<void>;
  cancelReindex: () => Promise<void>;

  // readonly resolution actions
  startReadonly: () => Promise<void>;
  cancelReadonly: () => Promise<void>;

  // delete resolution actions
  startDelete: () => Promise<void>;
}

const DataStreamMigrationContext = createContext<MigrationStateContext | undefined>(undefined);

export const useDataStreamMigrationContext = () => {
  const context = useContext(DataStreamMigrationContext);
  if (context === undefined) {
    throw new Error(
      'useDataStreamMigrationContext must be used within a <DataStreamMigrationStatusProvider />'
    );
  }
  return context;
};

interface Props {
  api: ApiService;
  children: React.ReactNode;
  dataStreamName: string;
}

export const DataStreamMigrationStatusProvider: React.FunctionComponent<Props> = ({
  api,
  dataStreamName,
  children,
}) => {
  const {
    migrationState,
    cancelReadonly,
    startReindex,
    loadDataStreamMetadata,
    cancelReindex,
    startReadonly,
    initMigration,
    startDelete,
  } = useMigrationStatus({
    dataStreamName,
    api,
  });

  return (
    <DataStreamMigrationContext.Provider
      value={{
        migrationState,
        startReindex,
        cancelReindex,
        startReadonly,
        cancelReadonly,
        initMigration,
        loadDataStreamMetadata,
        startDelete,
      }}
    >
      {children}
    </DataStreamMigrationContext.Provider>
  );
};
