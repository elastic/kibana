/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SetupModeData {
  totalUniqueInstanceCount: number;
  totalUniquePartiallyMigratedCount: number;
  totalUniqueFullyMigratedCount: number;
  detected: {
    mightExist: boolean;
  };
  [key: string]: any;
}

export interface SetupModeMeta {
  liveClusterUuid: string;
}

export interface Instance {
  uuid: string;
  name: string;
}

export interface SetupMode {
  openFlyout: (instance: Instance) => () => void;
  shortcutToFinishMigration: () => void;
  data: SetupModeData;
  meta: SetupModeMeta;
  [key: string]: any;
}
