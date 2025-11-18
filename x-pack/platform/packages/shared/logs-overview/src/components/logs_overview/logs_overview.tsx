/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { type DataViewsContract } from '@kbn/data-views-plugin/public';
import { type LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import { createConsoleInspector } from '@kbn/xstate-utils';
import React, { useCallback } from 'react';
import type { LogsOverviewFeatureFlags } from '../../types';
import type { LogsSourceConfiguration } from '../../utils/logs_source';
import { resolveLogsSourceActor } from '../../utils/logs_source';
import type { MlApiDependency } from '../../utils/ml_capabilities';
import { loadMlCapabilitiesActor } from '../../utils/ml_capabilities';
import type { LogCategoriesDependencies, LogCategoriesProps } from '../log_categories';
import { LogCategories } from '../log_categories';
import type { LogEventsDependencies, LogEventsProps } from '../log_events';
import { LogEvents } from '../log_events';
import type { GroupingCapabilities } from '../shared/control_bar';
import type { Grouping } from '../shared/grouping_selector';
import { LogsOverviewErrorContent } from './logs_overview_error_content';
import { LogsOverviewLoadingContent } from './logs_overview_loading_content';
import { LogsOverviewStateContext, logsOverviewStateMachine } from './logs_overview_state_provider';

export type LogsOverviewProps = Pick<LogsOverviewContentProps, 'height' | 'timeRange'> & {
  dependencies: LogsOverviewDependencies;
  documentFilters?: QueryDslQueryContainer[];
  nonHighlightingFilters?: QueryDslQueryContainer[];
  featureFlags?: LogsOverviewFeatureFlags | undefined;
  logsSource?: LogsSourceConfiguration | undefined;
};

export type LogsOverviewDependencies = LogsOverviewContentDependencies & {
  logsDataAccess: LogsDataAccessPluginStart;
  dataViews: DataViewsContract;
  mlApi: MlApiDependency;
};

export const LogsOverview: React.FC<LogsOverviewProps> = React.memo(
  ({
    dependencies,
    documentFilters = defaultDocumentFilters,
    nonHighlightingFilters = defaultNonHighlightingFilters,
    featureFlags = defaultFeatureFlags,
    height,
    logsSource = defaultLogsSource,
    timeRange,
  }) => {
    return (
      <LogsOverviewStateContext.Provider
        logic={logsOverviewStateMachine.provide({
          actors: {
            resolveLogsSource: resolveLogsSourceActor({
              logsDataAccess: dependencies.logsDataAccess,
              dataViewsService: dependencies.dataViews,
            }),
            loadMlCapabilities: loadMlCapabilitiesActor({
              mlApi: dependencies.mlApi,
            }),
          },
        })}
        options={{
          input: {
            featureFlags,
            logsSource,
          },
          inspect: consoleInspector,
        }}
      >
        <LogsOverviewContent
          dependencies={dependencies}
          documentFilters={documentFilters}
          nonHighlightingFilters={nonHighlightingFilters}
          height={height}
          timeRange={timeRange}
        />
      </LogsOverviewStateContext.Provider>
    );
  }
);

export type LogsOverviewContentProps = Pick<
  LogCategoriesProps,
  'height' | 'timeRange' | 'documentFilters' | 'nonHighlightingFilters'
> &
  Pick<LogEventsProps, 'height' | 'timeRange' | 'documentFilters' | 'nonHighlightingFilters'> & {
    dependencies: LogsOverviewDependencies;
  };

export type LogsOverviewContentDependencies = LogCategoriesDependencies & LogEventsDependencies;

export const LogsOverviewContent = React.memo<LogsOverviewContentProps>(
  ({ dependencies, documentFilters, nonHighlightingFilters, height, timeRange }) => {
    const logsOverviewStateActorRef = LogsOverviewStateContext.useActorRef();

    const logsOverviewState = LogsOverviewStateContext.useSelector(identity);
    const grouping = LogsOverviewStateContext.useSelector<Grouping>((currentState) =>
      currentState.matches('showingLogCategories') ? 'categories' : 'none'
    );
    const groupingCapabilities = LogsOverviewStateContext.useSelector<GroupingCapabilities>(
      (currentState) => {
        if (currentState.context.mlCapabilities.status === 'unresolved') {
          return { status: 'unavailable', reason: 'unknown' };
        } else if (currentState.context.mlCapabilities.status === 'unavailable') {
          return {
            status: 'unavailable',
            reason: currentState.context.mlCapabilities.reason,
          };
        }

        return { status: 'available' };
      }
    );

    const changeGrouping = useCallback(
      (newGrouping: Grouping) => {
        if (newGrouping === 'categories') {
          logsOverviewStateActorRef.send({ type: 'SHOW_LOG_CATEGORIES' });
        } else if (newGrouping === 'none') {
          logsOverviewStateActorRef.send({ type: 'SHOW_LOG_EVENTS' });
        }
      },
      [logsOverviewStateActorRef]
    );

    const allFiltersForCategories = React.useMemo(
      () => [...(documentFilters || []), ...(nonHighlightingFilters || [])],
      [documentFilters, nonHighlightingFilters]
    );

    if (logsOverviewState.matches('initializing')) {
      return <LogsOverviewLoadingContent />;
    } else if (logsOverviewState.matches('failedToInitialize')) {
      return <LogsOverviewErrorContent error={logsOverviewState.context.error} />;
    } else {
      if (logsOverviewState.context.logsSource.status === 'unresolved') {
        return <LogsOverviewErrorContent error={new Error('Logs source is unresolved')} />;
      }

      if (logsOverviewState.matches('showingLogCategories')) {
        return (
          <LogCategories
            dependencies={dependencies}
            documentFilters={allFiltersForCategories}
            logsSource={logsOverviewState.context.logsSource.value}
            timeRange={timeRange}
            grouping={grouping}
            groupingCapabilities={groupingCapabilities}
            height={height}
            onChangeGrouping={changeGrouping}
          />
        );
      } else if (logsOverviewState.matches('showingLogEvents')) {
        return (
          <LogEvents
            dependencies={dependencies}
            documentFilters={documentFilters}
            nonHighlightingFilters={nonHighlightingFilters}
            logsSource={logsOverviewState.context.logsSource.value}
            timeRange={timeRange}
            grouping={grouping}
            groupingCapabilities={groupingCapabilities}
            height={height}
            onChangeGrouping={changeGrouping}
          />
        );
      }
    }
  }
);

const defaultDocumentFilters: QueryDslQueryContainer[] = [];

const defaultNonHighlightingFilters: QueryDslQueryContainer[] = [];

const defaultFeatureFlags: LogsOverviewFeatureFlags = {
  isPatternsEnabled: true,
};

const defaultLogsSource: LogsSourceConfiguration = { type: 'shared_setting' };

const identity = <T extends any>(value: T): T => value;

const consoleInspector = createConsoleInspector();
