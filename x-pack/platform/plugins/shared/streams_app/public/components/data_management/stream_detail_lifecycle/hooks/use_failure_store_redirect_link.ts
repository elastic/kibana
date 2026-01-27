/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { useKibana } from '../../../../hooks/use_kibana';
import { getFailureStoreIndexName } from '../helpers/failure_store_index_name';

export const useFailureStoreRedirectLink = ({ streamName }: { streamName: string }) => {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();

  const failureIndexPatterns = getFailureStoreIndexName(streamName);
  const esqlQuery = failureIndexPatterns ? `FROM ${failureIndexPatterns}` : undefined;

  const useUrl = share.url.locators.useUrl;

  const discoverLink = useUrl<DiscoverAppLocatorParams>(
    () => ({
      id: DISCOVER_APP_LOCATOR,
      params: {
        query: { esql: esqlQuery || '' },
        timeRange: {
          from: 'now-24h',
          to: 'now',
        },
        refreshInterval: {
          pause: true,
          value: 60000,
        },
      },
    }),
    [esqlQuery]
  );

  return {
    href: discoverLink,
  };
};
