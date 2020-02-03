/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchServiceSetup } from 'kibana/server';
import { once } from 'lodash';

const callWithRequest = once((elasticsearchService: ElasticsearchServiceSetup) => {
  return elasticsearchService.createClient('remote_clusters', {});
});

export const callWithRequestFactory = (
  elasticsearchService: ElasticsearchServiceSetup,
  request: any
) => {
  return (...args: any[]) => {
    return (
      callWithRequest(elasticsearchService)
        .asScoped(request)
        // @ts-ignore
        .callAsCurrentUser(...args)
    );
  };
};
