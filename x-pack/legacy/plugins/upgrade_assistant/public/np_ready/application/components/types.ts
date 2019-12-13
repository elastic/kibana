/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EnrichedDeprecationInfo,
  UpgradeAssistantStatus,
} from '../../../../server/np_ready/lib/es_migration_apis';

export interface UpgradeAssistantTabProps {
  alertBanner?: React.ReactNode;
  checkupData?: UpgradeAssistantStatus;
  deprecations?: EnrichedDeprecationInfo[];
  refreshCheckupData: () => Promise<void>;
  loadingError?: Error;
  loadingState: LoadingState;
  setSelectedTabIndex: (tabIndex: number) => void;
}

// eslint-disable-next-line react/prefer-stateless-function
export class UpgradeAssistantTabComponent<
  T extends UpgradeAssistantTabProps = UpgradeAssistantTabProps,
  S = {}
> extends React.Component<T, S> {}

export enum LoadingState {
  Loading,
  Success,
  Error,
}

export enum LevelFilterOption {
  all = 'all',
  critical = 'critical',
}

export enum GroupByOption {
  message = 'message',
  index = 'index',
  node = 'node',
}

export enum TelemetryState {
  Running,
  Complete,
}
