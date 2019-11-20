/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { XPackMainPlugin } from '../../../xpack_main/xpack_main';
import { ElasticsearchPlugin } from '../../../../../../src/legacy/core_plugins/elasticsearch';

export interface ServerShim {
  route: any;
  plugins: {
    xpack_main: XPackMainPlugin;
    watcher: any;
    elasticsearch: ElasticsearchPlugin;
  };
}

export interface ServerShimWithRouter extends ServerShim {
  router: IRouter;
}
