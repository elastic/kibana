/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, ElasticsearchServiceSetup, IClusterClient } from 'src/core/server';
import { XPackMainPlugin } from '../../xpack_main/server/xpack_main';

export interface ServerShim {
  plugins: {
    xpack_main: XPackMainPlugin;
    rollup: any;
    index_management: any;
  };
}

export interface RouteDependencies {
  router: IRouter;
  elasticsearchService: ElasticsearchServiceSetup;
  elasticsearch: IClusterClient;
}
