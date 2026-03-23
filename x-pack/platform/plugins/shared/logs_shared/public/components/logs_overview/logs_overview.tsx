/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_LOGS_SHARED_NEW_LOGS_OVERVIEW_ID } from '@kbn/management-settings-ids';
import type {
  LogsOverviewProps as FullLogsOverviewProps,
  LogsOverviewDependencies,
  LogsOverviewErrorContentProps,
} from '@kbn/logs-overview';
import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { map } from 'rxjs';

const LazyLogsOverview = dynamic(() =>
  import('@kbn/logs-overview').then((mod) => ({ default: mod.LogsOverview }))
);

const LazyLogsOverviewErrorContent = dynamic(() =>
  import('@kbn/logs-overview').then((mod) => ({
    default: mod.LogsOverviewErrorContent,
  }))
);

const LazyLogsOverviewLoadingContent = dynamic(() =>
  import('@kbn/logs-overview').then((mod) => ({
    default: mod.LogsOverviewLoadingContent,
  }))
);

export type LogsOverviewProps = Omit<FullLogsOverviewProps, 'dependencies' | 'featureFlags'>;

export interface SelfContainedLogsOverviewHelpers {
  ErrorContent: React.ComponentType<LogsOverviewErrorContentProps>;
  LoadingContent: React.ComponentType;
}

export type SelfContainedLogsOverviewComponent = React.ComponentType<LogsOverviewProps>;

export type SelfContainedLogsOverview = SelfContainedLogsOverviewComponent &
  SelfContainedLogsOverviewHelpers;

export const createLogsOverview = (
  dependencies: LogsOverviewDependencies
): SelfContainedLogsOverview => {
  // Could be derived from multiple settings via `combineLatest`, but for now we
  // only have one feature flag.
  const featureFlags$ = dependencies.uiSettings.client
    .get$<boolean>(OBSERVABILITY_LOGS_SHARED_NEW_LOGS_OVERVIEW_ID)
    .pipe(
      map((value) => ({
        isPatternsEnabled: value,
      }))
    );

  const SelfContainedLogsOverview = (props: LogsOverviewProps) => {
    const featureFlags = useObservable(featureFlags$, undefined);

    return <LazyLogsOverview dependencies={dependencies} featureFlags={featureFlags} {...props} />;
  };

  SelfContainedLogsOverview.ErrorContent = LazyLogsOverviewErrorContent;

  SelfContainedLogsOverview.LoadingContent = LazyLogsOverviewLoadingContent;

  return SelfContainedLogsOverview;
};
