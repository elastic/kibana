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
import { LogsOverviewFeatureFlags } from '../../types';
import { LogsSourceConfiguration, resolveLogsSourceActor } from '../../utils/logs_source';
import { MlApiDependency, loadMlCapabilitiesActor } from '../../utils/ml_capabilities';
import { LogCategories, LogCategoriesDependencies, LogCategoriesProps } from '../log_categories';
import { LogEvents, LogEventsDependencies, LogEventsProps } from '../log_events';
import { GroupingCapabilities } from '../shared/control_bar';
import { Grouping } from '../shared/grouping_selector';
import { LogsOverviewErrorContent } from './logs_overview_error_content';
import { LogsOverviewLoadingContent } from './logs_overview_loading_content';
import { LogsOverviewStateContext, logsOverviewStateMachine } from './logs_overview_state_provider';

export type LogsOverviewProps = Pick<LogsOverviewContentProps, 'height' | 'timeRange'> & {
  dependencies: LogsOverviewDependencies;
  documentFilters?: QueryDslQueryContainer[] | undefined;
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
          height={height}
          timeRange={timeRange}
        />
      </LogsOverviewStateContext.Provider>
    );
  }
);

export type LogsOverviewContentProps = Pick<
  LogCategoriesProps,
  'height' | 'timeRange' | 'documentFilters'
> &
  Pick<LogEventsProps, 'height' | 'timeRange' | 'documentFilters'> & {
    dependencies: LogsOverviewDependencies;
  };

export type LogsOverviewContentDependencies = LogCategoriesDependencies & LogEventsDependencies;

export const LogsOverviewContent = React.memo<LogsOverviewContentProps>(
  ({ dependencies, documentFilters, height, timeRange }) => {
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
            documentFilters={documentFilters}
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

const defaultFeatureFlags: LogsOverviewFeatureFlags = {
  isPatternsEnabled: true,
};

const defaultLogsSource: LogsSourceConfiguration = { type: 'shared_setting' };

const identity = <T extends any>(value: T): T => value;

const consoleInspector = createConsoleInspector();
