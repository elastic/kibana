/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ISearchGeneric } from '@kbn/search-types';
import { createConsoleInspector } from '@kbn/xstate-utils';
import { useMachine } from '@xstate5/react';
import React, { useCallback } from 'react';
import {
  categorizeLogsService,
  createCategorizeLogsServiceImplementations,
} from '../../services/categorize_logs_service';
import { IndexNameLogsSourceConfiguration } from '../../utils/logs_source';
import { LogCategoriesErrorContent } from './log_categories_error_content';
import { LogCategoriesLoadingContent } from './log_categories_loading_content';
import {
  LogCategoriesResultContent,
  LogCategoriesResultContentDependencies,
} from './log_categories_result_content';

export interface LogCategoriesProps {
  dependencies: LogCategoriesDependencies;
  documentFilters?: QueryDslQueryContainer[];
  logsSource: IndexNameLogsSourceConfiguration;
  // The time range could be made optional if we want to support an internal
  // time range picker
  timeRange: {
    start: string;
    end: string;
  };
}

export type LogCategoriesDependencies = LogCategoriesResultContentDependencies & {
  search: ISearchGeneric;
};

export const LogCategories: React.FC<LogCategoriesProps> = ({
  dependencies,
  documentFilters = [],
  logsSource,
  timeRange,
}) => {
  const [categorizeLogsServiceState, sendToCategorizeLogsService] = useMachine(
    categorizeLogsService.provide(
      createCategorizeLogsServiceImplementations({ search: dependencies.search })
    ),
    {
      inspect: consoleInspector,
      input: {
        index: logsSource.indexName,
        startTimestamp: timeRange.start,
        endTimestamp: timeRange.end,
        timeField: logsSource.timestampField,
        messageField: logsSource.messageField,
        documentFilters,
      },
    }
  );

  const cancelOperation = useCallback(() => {
    sendToCategorizeLogsService({
      type: 'cancel',
    });
  }, [sendToCategorizeLogsService]);

  if (categorizeLogsServiceState.matches('done')) {
    return (
      <LogCategoriesResultContent
        dependencies={dependencies}
        documentFilters={documentFilters}
        logCategories={categorizeLogsServiceState.context.categories}
        logsSource={logsSource}
        timeRange={timeRange}
      />
    );
  } else if (categorizeLogsServiceState.matches('failed')) {
    return <LogCategoriesErrorContent error={categorizeLogsServiceState.context.error} />;
  } else if (categorizeLogsServiceState.matches('countingDocuments')) {
    return <LogCategoriesLoadingContent onCancel={cancelOperation} stage="counting" />;
  } else if (
    categorizeLogsServiceState.matches('fetchingSampledCategories') ||
    categorizeLogsServiceState.matches('fetchingRemainingCategories')
  ) {
    return <LogCategoriesLoadingContent onCancel={cancelOperation} stage="categorizing" />;
  } else {
    return null;
  }
};

const consoleInspector = createConsoleInspector();
