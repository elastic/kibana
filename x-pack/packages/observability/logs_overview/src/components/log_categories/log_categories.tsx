/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchGeneric } from '@kbn/search-types';
import { createConsoleInspector } from '@kbn/xstate-utils';
import { useMachine } from '@xstate5/react';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  categorizeLogsService,
  createCategorizeLogsServiceImplementations,
} from '../../services/categorize_logs_service';
import { LogCategoriesLoadingContent } from './logs_categories_loading_content';
import {
  LogCategoriesResultContent,
  LogCategoriesResultContentDependencies,
} from './logs_categories_result_content';

interface LogCategoriesProps {
  dependencies: LogCategoriesDependencies;
}

export type LogCategoriesDependencies = LogCategoriesResultContentDependencies & {
  search: ISearchGeneric;
};

export const LogCategories: React.FC<LogCategoriesProps> = ({ dependencies }) => {
  const [categorizeLogsServiceState, sendToCategorizeLogsService] = useMachine(
    categorizeLogsService.provide(
      createCategorizeLogsServiceImplementations({ search: dependencies.search })
    ),
    {
      inspect: consoleInspector,
      input: {
        index: 'logs-*-*',
        start: '2024-12-01T00:00:00.000Z',
        end: '2024-12-03T00:00:00.000Z',
        timeField: '@timestamp',
        messageField: 'message',
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
