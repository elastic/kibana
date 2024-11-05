/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiButton } from '@elastic/eui';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { FilterStateStore, buildCustomFilter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { getRouterLinkProps } from '@kbn/router-utils';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import React, { useCallback, useMemo } from 'react';
import type { ResolvedIndexNameLogsSourceConfiguration } from '../../utils/logs_source';

interface LinkFilter {
  filter: QueryDslQueryContainer;
  meta?: {
    name?: string;
  };
}
export interface DiscoverLinkProps {
  documentFilters?: LinkFilter[];
  logsSource: ResolvedIndexNameLogsSourceConfiguration;
  timeRange: {
    start: string;
    end: string;
  };
  dependencies: DiscoverLinkDependencies;
}

export interface DiscoverLinkDependencies {
  share: SharePluginStart;
}

export const DiscoverLink = React.memo(
  ({ dependencies: { share }, documentFilters, logsSource, timeRange }: DiscoverLinkProps) => {
    const discoverLocatorParams = useMemo<DiscoverAppLocatorParams>(
      () => ({
        dataViewSpec: {
          id: logsSource.indexName,
          name: logsSource.indexName,
          title: logsSource.indexName,
          timeFieldName: logsSource.timestampField,
        },
        timeRange: {
          from: timeRange.start,
          to: timeRange.end,
        },
        filters: documentFilters?.map((filter) =>
          buildCustomFilter(
            logsSource.indexName,
            filter.filter,
            false,
            false,
            filter.meta?.name ?? categorizedLogsFilterLabel,
            FilterStateStore.APP_STATE
          )
        ),
      }),
      [
        documentFilters,
        logsSource.indexName,
        logsSource.timestampField,
        timeRange.end,
        timeRange.start,
      ]
    );

    const discoverLocator = useMemo(
      () => share.url.locators.get<DiscoverAppLocatorParams>('DISCOVER_APP_LOCATOR'),
      [share.url.locators]
    );

    const discoverUrl = useMemo(
      () => discoverLocator?.getRedirectUrl(discoverLocatorParams),
      [discoverLocatorParams, discoverLocator]
    );

    const navigateToDiscover = useCallback(() => {
      discoverLocator?.navigate(discoverLocatorParams);
    }, [discoverLocatorParams, discoverLocator]);

    const discoverLinkProps = getRouterLinkProps({
      href: discoverUrl,
      onClick: navigateToDiscover,
    });

    return (
      <EuiButton
        {...discoverLinkProps}
        color="primary"
        iconType="discoverApp"
        data-test-subj="logsExplorerDiscoverFallbackLink"
      >
        {discoverLinkTitle}
      </EuiButton>
    );
  }
);

export const discoverLinkTitle = i18n.translate(
  'xpack.observabilityLogsOverview.discoverLinkTitle',
  {
    defaultMessage: 'Open in Discover',
  }
);

export const categorizedLogsFilterLabel = i18n.translate(
  'xpack.observabilityLogsOverview.categorizedLogsFilterLabel',
  {
    defaultMessage: 'Categorized log entries',
  }
);
