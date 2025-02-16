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
import {
  categoryDetailsService,
  createCategoryDetailsServiceImplementations,
} from '../../services/category_details_service';
import { LogCategory } from '../../types';
import { ResolvedIndexNameLogsSourceConfiguration } from '../../utils/logs_source';
import { LogCategoriesErrorContent } from './log_categories_error_content';
import { LogCategoriesLoadingContent } from './log_categories_loading_content';
import {
  LogCategoriesResultContent,
  LogCategoriesResultContentDependencies,
} from './log_categories_result_content';

export interface LogCategoriesProps {
  dependencies: LogCategoriesDependencies;
  documentFilters?: QueryDslQueryContainer[];
  logsSource: ResolvedIndexNameLogsSourceConfiguration;
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

  const [categoryDetailsServiceState, sendToCategoryDetailsService] = useMachine(
    categoryDetailsService.provide(
      createCategoryDetailsServiceImplementations({ search: dependencies.search })
    ),
    {
      inspect: consoleInspector,
      input: {
        index: logsSource.indexName,
        startTimestamp: timeRange.start,
        endTimestamp: timeRange.end,
        timeField: logsSource.timestampField,
        messageField: logsSource.messageField,
        additionalFilters: documentFilters,
        dataView: logsSource.dataView,
      },
    }
  );

  const cancelOperation = useCallback(() => {
    sendToCategorizeLogsService({
      type: 'cancel',
    });
  }, [sendToCategorizeLogsService]);

  const closeFlyout = useCallback(() => {
    sendToCategoryDetailsService({
      type: 'setExpandedCategory',
      category: null,
      rowIndex: null,
    });
  }, [sendToCategoryDetailsService]);

  const openFlyout = useCallback(
    (category: LogCategory | null, rowIndex: number | null) => {
      sendToCategoryDetailsService({
        type: 'setExpandedCategory',
        category,
        rowIndex,
      });
    },
    [sendToCategoryDetailsService]
  );

  if (categorizeLogsServiceState.matches('done')) {
    return (
      <LogCategoriesResultContent
        dependencies={dependencies}
        documentFilters={documentFilters}
        logCategories={categorizeLogsServiceState.context.categories}
        logsSource={logsSource}
        timeRange={timeRange}
        categoryDetailsServiceState={categoryDetailsServiceState}
        onCloseFlyout={closeFlyout}
        onOpenFlyout={openFlyout}
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
