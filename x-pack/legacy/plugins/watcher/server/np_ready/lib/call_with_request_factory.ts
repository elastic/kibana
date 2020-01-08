/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchServiceSetup } from 'src/core/server';
import { once } from 'lodash';
import { elasticsearchJsPlugin } from './elasticsearch_js_plugin';

const callWithRequest = once((elasticsearchService: ElasticsearchServiceSetup) => {
  const config = { plugins: [elasticsearchJsPlugin] };
  return elasticsearchService.createClient('watcher', config);
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
