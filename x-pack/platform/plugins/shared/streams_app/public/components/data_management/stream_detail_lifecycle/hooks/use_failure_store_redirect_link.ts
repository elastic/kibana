/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { getIndexPatternsForStream, type Streams } from '@kbn/streams-schema';
import { FAILURE_STORE_SELECTOR } from '../../../../util/constants';
import { useKibana } from '../../../../hooks/use_kibana';

export const useFailureStoreRedirectLink = ({
  definition,
}: {
  definition: Streams.ingest.all.GetResponse;
}) => {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();

  const indexPatterns = getIndexPatternsForStream(definition.stream);
  const failureIndexPatterns = indexPatterns?.map((pattern, index) => {
    return indexPatterns.length === 1 || index > 0
      ? `${pattern}${FAILURE_STORE_SELECTOR}`
      : pattern;
  });
  const esqlQuery = failureIndexPatterns ? `FROM ${failureIndexPatterns.join(', ')}` : undefined;

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
