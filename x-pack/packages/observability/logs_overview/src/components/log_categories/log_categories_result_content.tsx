/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { LogCategory } from '../../types';
import { LogCategoriesGrid, LogCategoriesGridDependencies } from './log_categories_grid';

export interface LogCategoriesResultContentProps {
  dependencies: LogCategoriesResultContentDependencies;
  logCategories: LogCategory[];
}

export type LogCategoriesResultContentDependencies = LogCategoriesGridDependencies;

export const LogCategoriesResultContent: React.FC<LogCategoriesResultContentProps> = ({
  dependencies,
  logCategories,
}) => {
  if (logCategories.length === 0) {
    return <LogCategoriesEmptyResultContent />;
  } else {
    return (
      <div>
        <LogCategoriesGrid dependencies={dependencies} logCategories={logCategories} />
      </div>
    );
  }
};

export const LogCategoriesEmptyResultContent: React.FC = () => {
  return (
    <EuiEmptyPrompt
      body={<p>{emptyResultContentDescription}</p>}
      color="subdued"
      layout="horizontal"
      title={<h2>{emptyResultContentTitle}</h2>}
      titleSize="m"
    />
  );
};

const emptyResultContentTitle = i18n.translate(
  'xpack.observabilityLogsOverview.logCategories.emptyResultContentTitle',
  {
    defaultMessage: 'No log categories found',
  }
);

const emptyResultContentDescription = i18n.translate(
  'xpack.observabilityLogsOverview.logCategories.emptyResultContentDescription',
  {
    defaultMessage:
      'No suitable documents within the time range. Try searching for a longer time period.',
  }
);
