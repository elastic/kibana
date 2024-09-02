/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchGeneric } from '@kbn/search-types';
import { createConsoleInspector } from '@kbn/xstate-utils';
import { useMachine } from '@xstate5/react';
import React from 'react';
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
  const [categorizeLogsServiceState, _sendToCategorizeLogsService] = useMachine(
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

  if (categorizeLogsServiceState.matches('done')) {
    return (
      <LogCategoriesResultContent
        dependencies={dependencies}
        logCategories={categorizeLogsServiceState.context.categories}
      />
    );
  } else if (categorizeLogsServiceState.matches('failed')) {
    return <div>Error</div>;
  } else {
    return <LogCategoriesLoadingContent />;
  }
};

const consoleInspector = createConsoleInspector();
