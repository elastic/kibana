/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { useEffect } from 'react';
import { StaticIndexPattern } from 'ui/index_patterns';
import { DocumentTitle } from '../../../components/document_title';
import { MetricsExplorerCharts } from '../../../components/metrics_explorer/charts';
import { MetricsExplorerToolbar } from '../../../components/metrics_explorer/toolbar';
import { SourceQuery } from '../../../../common/graphql/types';
import { NoData } from '../../../components/empty_states';
import { fetch } from '../../../utils/fetch';
import { useMetricsExplorerState } from './use_metric_explorer_state';

interface MetricsExplorerPageProps {
  intl: InjectedIntl;
  source: SourceQuery.Query['source']['configuration'] | undefined;
  derivedIndexPattern: StaticIndexPattern;
}

export const MetricsExplorerPage = injectI18n(
  ({ intl, source, derivedIndexPattern }: MetricsExplorerPageProps) => {
    if (!source) {
      return null;
    }

    const {
      loading,
      error,
      data,
      currentTimerange,
      options,
      handleAggregationChange,
      handleMetricsChange,
      handleFilterQuerySubmit,
      handleGroupByChange,
      handleTimeChange,
      handleRefresh,
      handleLoadMore,
    } = useMetricsExplorerState(source, derivedIndexPattern);

    // Generate an index pattern if one doesn't exist the moment the app starts.
    // This will prevent clicking on "Open in visualize" from redirecting to the
    // index pattern page
    useEffect(
      () => {
        fetch.get('../api/infra/generate_index_pattern');
      },
      [true] // Only run on initial render
    );

    return (
      <div>
        <DocumentTitle
          title={(previousTitle: string) =>
            intl.formatMessage(
              {
                id: 'xpack.infra.infrastructureMetricsExplorerPage.documentTitle',
                defaultMessage: '{previousTitle} | Metrics Explorer',
              },
              {
                previousTitle,
              }
            )
          }
        />
        <MetricsExplorerToolbar
          derivedIndexPattern={derivedIndexPattern}
          timeRange={currentTimerange}
          options={options}
          onRefresh={handleRefresh}
          onTimeChange={handleTimeChange}
          onGroupByChange={handleGroupByChange}
          onFilterQuerySubmit={handleFilterQuerySubmit}
          onMetricsChange={handleMetricsChange}
          onAggregationChange={handleAggregationChange}
        />
        {error ? (
          <NoData
            titleText="Whoops!"
            bodyText={intl.formatMessage(
              {
                id: 'xpack.infra.metricsExplorer.errorMessage',
                defaultMessage: 'It looks like the request failed with "{message}"',
              },
              { message: error.message }
            )}
            onRefetch={handleRefresh}
            refetchText="Try Again"
          />
        ) : (
          <MetricsExplorerCharts
            timeRange={currentTimerange}
            loading={loading}
            data={data}
            source={source}
            options={options}
            onLoadMore={handleLoadMore}
            onFilter={handleFilterQuerySubmit}
            onRefetch={handleRefresh}
            onTimeChange={handleTimeChange}
          />
        )}
      </div>
    );
  }
);
