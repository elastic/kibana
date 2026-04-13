/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { StateFrom } from 'xstate';
import type { categoryDetailsService } from '../../services/category_details_service';
import type { LogCategory } from '../../types';
import type { ResolvedIndexNameLogsSourceConfiguration } from '../../utils/logs_source';
import type { LogCategoriesFlyoutDependencies } from '../log_category_details/log_category_details_flyout';
import { LogCategoryDetailsFlyout } from '../log_category_details/log_category_details_flyout';
import type { LogCategoriesGridDependencies } from './log_categories_grid';
import { LogCategoriesGrid } from './log_categories_grid';

export interface LogCategoriesResultContentProps {
  dependencies: LogCategoriesResultContentDependencies;
  documentFilters: QueryDslQueryContainer[];
  logCategories: LogCategory[];
  logsSource: ResolvedIndexNameLogsSourceConfiguration;
  timeRange: {
    start: string;
    end: string;
  };
  categoryDetailsServiceState: StateFrom<typeof categoryDetailsService>;
  onCloseFlyout: () => void;
  onOpenFlyout: (category: LogCategory, rowIndex: number) => void;
}

export type LogCategoriesResultContentDependencies = LogCategoriesGridDependencies &
  LogCategoriesFlyoutDependencies;

export const LogCategoriesResultContent: React.FC<LogCategoriesResultContentProps> = ({
  dependencies,
  documentFilters,
  logCategories,
  logsSource,
  timeRange,
  categoryDetailsServiceState,
  onCloseFlyout,
  onOpenFlyout,
}) => {
  if (logCategories.length === 0) {
    return <LogCategoriesEmptyResultContent />;
  } else {
    return (
      <>
        <LogCategoriesGrid
          dependencies={dependencies}
          logCategories={logCategories}
          expandedRowIndex={categoryDetailsServiceState.context.expandedRowIndex}
          onOpenFlyout={onOpenFlyout}
          onCloseFlyout={onCloseFlyout}
        />
        {categoryDetailsServiceState.context.expandedCategory && (
          <LogCategoryDetailsFlyout
            logCategory={categoryDetailsServiceState.context.expandedCategory}
            onCloseFlyout={onCloseFlyout}
            logsSource={logsSource}
            dependencies={dependencies}
            documentFilters={documentFilters}
            timeRange={timeRange}
          />
        )}
      </>
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
