/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESResponse } from './fetcher';
import { AvgDurationByBrowserAPIResponse } from '.';
import { Coordinate } from '../../../../typings/timeseries';

export function transformer({
  response
}: {
  response: ESResponse;
}): AvgDurationByBrowserAPIResponse {
  const allUserAgentKeys = new Set<string>(
    (response.aggregations?.user_agent_keys?.buckets ?? []).map(({ key }) =>
      key.toString()
    )
  );
  const buckets = response.aggregations?.browsers?.buckets ?? [];

  const series = buckets.reduce<{ [key: string]: Coordinate[] }>(
    (acc, next) => {
      const userAgentBuckets = next.user_agent?.buckets ?? [];
      const x = next.key;
      const seenUserAgentKeys = new Set<string>();

      userAgentBuckets.map(userAgentBucket => {
        const key = userAgentBucket.key;
        const y = userAgentBucket.avg_duration?.value;

        seenUserAgentKeys.add(key.toString());
        acc[key] = (acc[key] || []).concat({ x, y });
      });

      const emptyUserAgents = new Set<string>(
        [...allUserAgentKeys].filter(key => !seenUserAgentKeys.has(key))
      );

      // If no user agent requests exist for this bucked, fill in the data with
      // undefined
      [...emptyUserAgents].map(key => {
        acc[key] = (acc[key] || []).concat({ x, y: undefined });
      });

      return acc;
    },
    {}
  );

  return Object.entries(series).map(([title, data]) => ({ title, data }));
}
