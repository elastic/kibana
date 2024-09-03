/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ISearchGeneric } from '@kbn/search-types';
import { createConsoleInspector } from '@kbn/xstate-utils';
import { useMachine } from '@xstate5/react';
import React, { useCallback, useMemo } from 'react';
import { LogsSourceConfiguration, normalizeLogsSource } from '../../../utils/logs_source';
import {
  categorizeLogsService,
  createCategorizeLogsServiceImplementations,
} from '../../services/categorize_logs_service';
import { LogCategoriesLoadingContent } from './log_categories_loading_content';
import {
  LogCategoriesResultContent,
  LogCategoriesResultContentDependencies,
} from './log_categories_result_content';

export interface LogCategoriesProps {
  dependencies: LogCategoriesDependencies;
  logsSource: LogsSourceConfiguration;
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
  logsSource,
  timeRange,
}) => {
  const categorizeLogsServiceInput = useMemo(() => {
    const normalizedLogsSource = normalizeLogsSource(logsSource);
    return {
      index: normalizedLogsSource.indexName,
      startTimestamp: timeRange.start,
      endTimestamp: timeRange.end,
      timeField: normalizedLogsSource.timestampField,
      messageField: normalizedLogsSource.messageField,
    };
  }, [logsSource, timeRange.end, timeRange.start]);

  const [categorizeLogsServiceState, sendToCategorizeLogsService] = useMachine(
    categorizeLogsService.provide(
      createCategorizeLogsServiceImplementations({ search: dependencies.search })
    ),
    {
      inspect: consoleInspector,
      input: categorizeLogsServiceInput,
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
        logCategories={categorizeLogsServiceState.context.categories}
      />
    );
  } else if (categorizeLogsServiceState.matches('failed')) {
    return (
      <div>
        {i18n.translate('xpack.observabilityLogsOverview.logCategories.div.errorLabel', {
          defaultMessage: 'Error',
        })}
      </div>
    );
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
