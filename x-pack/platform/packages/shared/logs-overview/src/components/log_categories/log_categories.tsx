/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ISearchGeneric } from '@kbn/search-types';
import { createConsoleInspector } from '@kbn/xstate-utils';
import React, { useCallback } from 'react';
import {
  CategorizeLogsServiceContext,
  categorizeLogsService,
  createCategorizeLogsServiceImplementations,
} from '../../services/categorize_logs_service';
import {
  CategoryDetailsServiceContext,
  categoryDetailsService,
  createCategoryDetailsServiceImplementations,
} from '../../services/category_details_service';
import { LogCategory } from '../../types';
import { ResolvedIndexNameLogsSourceConfiguration } from '../../utils/logs_source';
import {
  LogCategoriesControlBar,
  LogCategoriesControlBarDependencies,
  LogCategoriesControlBarProps,
} from './log_categories_control_bar';
import { LogCategoriesErrorContent } from './log_categories_error_content';
import { LogCategoriesLoadingContent } from './log_categories_loading_content';
import {
  LogCategoriesResultContent,
  LogCategoriesResultContentDependencies,
  LogCategoriesResultContentProps,
} from './log_categories_result_content';

export type LogCategoriesProps = LogCategoriesContentProps & {
  dependencies: LogCategoriesDependencies;
  documentFilters: QueryDslQueryContainer[];
  logsSource: ResolvedIndexNameLogsSourceConfiguration;
  // The time range could be made optional if we want to support an internal
  // time range picker
  timeRange: {
    start: string;
    end: string;
  };
};

export type LogCategoriesDependencies = LogCategoriesContentDependencies & {
  search: ISearchGeneric;
};

export const LogCategories = React.memo<LogCategoriesProps>(
  ({
    dependencies,
    documentFilters,
    logsSource,
    timeRange,
    grouping,
    groupingCapabilities,
    onChangeGrouping,
  }) => {
    return (
      <CategorizeLogsServiceContext.Provider
        logic={categorizeLogsService.provide(
          createCategorizeLogsServiceImplementations({ search: dependencies.search })
        )}
        options={{
          inspect: consoleInspector,
          input: {
            index: logsSource.indexName,
            startTimestamp: timeRange.start,
            endTimestamp: timeRange.end,
            timeField: logsSource.timestampField,
            messageField: logsSource.messageField,
            documentFilters,
          },
        }}
      >
        <CategoryDetailsServiceContext.Provider
          logic={categoryDetailsService.provide(
            createCategoryDetailsServiceImplementations({ search: dependencies.search })
          )}
          options={{
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
          }}
        >
          <LogCategoriesContent
            dependencies={dependencies}
            documentFilters={documentFilters}
            logsSource={logsSource}
            timeRange={timeRange}
            grouping={grouping}
            groupingCapabilities={groupingCapabilities}
            onChangeGrouping={onChangeGrouping}
          />
        </CategoryDetailsServiceContext.Provider>
      </CategorizeLogsServiceContext.Provider>
    );
  }
);

export type LogCategoriesContentProps = LogCategoriesControlBarProps &
  Omit<
    LogCategoriesResultContentProps,
    'categoryDetailsServiceState' | 'onCloseFlyout' | 'onOpenFlyout' | 'logCategories'
  > & {
    dependencies: LogCategoriesContentDependencies;
  };

export type LogCategoriesContentDependencies = LogCategoriesControlBarDependencies &
  LogCategoriesResultContentDependencies;

export const LogCategoriesContent = React.memo<LogCategoriesContentProps>(
  ({
    dependencies,
    documentFilters,
    logsSource,
    timeRange,
    grouping,
    groupingCapabilities,
    onChangeGrouping,
  }) => {
    const categorizeLogsServiceActorRef = CategorizeLogsServiceContext.useActorRef();
    const categorizeLogsServiceState = CategorizeLogsServiceContext.useSelector(identity);

    const categoryDetailsServiceActorRef = CategoryDetailsServiceContext.useActorRef();
    const categoryDetailsServiceState = CategoryDetailsServiceContext.useSelector(identity);

    const cancelOperation = useCallback(() => {
      categorizeLogsServiceActorRef.send({
        type: 'cancel',
      });
    }, [categorizeLogsServiceActorRef]);

    const closeFlyout = useCallback(() => {
      categoryDetailsServiceActorRef.send({
        type: 'setExpandedCategory',
        category: null,
        rowIndex: null,
      });
    }, [categoryDetailsServiceActorRef]);

    const openFlyout = useCallback(
      (category: LogCategory | null, rowIndex: number | null) => {
        categoryDetailsServiceActorRef.send({
          type: 'setExpandedCategory',
          category,
          rowIndex,
        });
      },
      [categoryDetailsServiceActorRef]
    );

    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <LogCategoriesControlBar
            dependencies={dependencies}
            documentFilters={documentFilters}
            logsSource={logsSource}
            timeRange={timeRange}
            grouping={grouping}
            groupingCapabilities={groupingCapabilities}
            onChangeGrouping={onChangeGrouping}
          />
        </EuiFlexItem>
        <EuiFlexItem grow>
          {categorizeLogsServiceState.matches('done') ? (
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
          ) : categorizeLogsServiceState.matches('failed') ? (
            <LogCategoriesErrorContent error={categorizeLogsServiceState.context.error} />
          ) : categorizeLogsServiceState.matches('countingDocuments') ? (
            <LogCategoriesLoadingContent onCancel={cancelOperation} stage="counting" />
          ) : categorizeLogsServiceState.matches('fetchingSampledCategories') ||
            categorizeLogsServiceState.matches('fetchingRemainingCategories') ? (
            <LogCategoriesLoadingContent onCancel={cancelOperation} stage="categorizing" />
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

const consoleInspector = createConsoleInspector();

const identity = <T extends any>(value: T): T => value;
