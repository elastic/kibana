/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { type LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import React, { useCallback } from 'react';
import { type DataViewsContract } from '@kbn/data-views-plugin/public';
import { createConsoleInspector } from '@kbn/xstate-utils';
import { type MlPluginStart } from '@kbn/ml-plugin/public';
import { LogsSourceConfiguration, resolveLogsSourceActor } from '../../utils/logs_source';
import { loadMlCapabilitiesActor } from '../../utils/ml_capabilities';
import { LogCategories, LogCategoriesDependencies } from '../log_categories';
import { LogsOverviewErrorContent } from './logs_overview_error_content';
import { LogsOverviewLoadingContent } from './logs_overview_loading_content';
import { LogsOverviewStateContext, logsOverviewStateMachine } from './logs_overview_state_provider';
import { LogEvents, LogEventsDependencies } from '../log_events';
import { Grouping } from '../shared/grouping_selector';

export type LogsOverviewProps = LogsOverviewContentProps & {
  dependencies: LogsOverviewDependencies;
  documentFilters: QueryDslQueryContainer[] | undefined;
  logsSource: LogsSourceConfiguration | undefined;
};

export type LogsOverviewDependencies = LogsOverviewContentDependencies & {
  logsDataAccess: LogsDataAccessPluginStart;
  dataViews: DataViewsContract;
  mlApi: MlPluginStart['mlApi'];
};

export const LogsOverview: React.FC<LogsOverviewProps> = React.memo(
  ({
    dependencies,
    documentFilters = defaultDocumentFilters,
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
            logsSource,
          },
          inspect: consoleInspector,
        }}
      >
        <LogsOverviewContent
          dependencies={dependencies}
          documentFilters={documentFilters}
          timeRange={timeRange}
        />
      </LogsOverviewStateContext.Provider>
    );
  }
);

export interface LogsOverviewContentProps {
  dependencies: LogsOverviewDependencies;
  documentFilters: QueryDslQueryContainer[];
  timeRange: {
    start: string;
    end: string;
  };
}

export type LogsOverviewContentDependencies = LogCategoriesDependencies & LogEventsDependencies;

export const LogsOverviewContent = React.memo<LogsOverviewContentProps>(
  ({ dependencies, documentFilters, timeRange }) => {
    const logsOverviewStateActorRef = LogsOverviewStateContext.useActorRef();

    const logsOverviewState = LogsOverviewStateContext.useSelector(identity);
    const grouping = LogsOverviewStateContext.useSelector<Grouping>((currentState) =>
      currentState.matches('showingLogCategories') ? 'categories' : 'none'
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
            onChangeGrouping={changeGrouping}
          />
        );
      }
    }
  }
);

const defaultDocumentFilters: QueryDslQueryContainer[] = [];

const defaultLogsSource: LogsSourceConfiguration = { type: 'shared_setting' };

const identity = <T extends any>(value: T): T => value;

const consoleInspector = createConsoleInspector();
