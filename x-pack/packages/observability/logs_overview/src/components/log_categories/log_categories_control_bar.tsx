/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import React from 'react';
import type { IndexNameLogsSourceConfiguration } from '../../utils/logs_source';
import { DiscoverLink } from '../discover_link';

export interface LogCategoriesControlBarProps {
  documentFilters?: QueryDslQueryContainer[];
  logsSource: IndexNameLogsSourceConfiguration;
  timeRange: {
    start: string;
    end: string;
  };
  dependencies: LogCategoriesControlBarDependencies;
}

export interface LogCategoriesControlBarDependencies {
  share: SharePluginStart;
}

export const LogCategoriesControlBar: React.FC<LogCategoriesControlBarProps> = React.memo(
  ({ dependencies, documentFilters, logsSource, timeRange }) => {
    return (
      <EuiFlexGroup direction="row" justifyContent="flexEnd" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <DiscoverLink
            dependencies={dependencies}
            documentFilters={documentFilters}
            logsSource={logsSource}
            timeRange={timeRange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
