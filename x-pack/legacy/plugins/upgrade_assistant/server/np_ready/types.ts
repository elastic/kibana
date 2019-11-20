/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Legacy } from 'kibana';
import { IRouter } from 'src/core/server';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { XPackMainPlugin } from '../../../xpack_main/xpack_main';

export interface ServerShim {
  usage: {
    collectorSet: {
      makeUsageCollector: any;
      register: any;
    };
  };
  plugins: {
    elasticsearch: ElasticsearchPlugin;
    xpack_main: XPackMainPlugin;
    cloud: {
      config: {
        isCloudEnabled: boolean;
      };
    };
  };
  log: any;
  events: any;
  savedObjects: Legacy.SavedObjectsService;
}

export interface ServerShimWithRouter extends ServerShim {
  router: IRouter;
}

export interface RequestShim {
  headers: Record<string, string>;
  payload: any;
  params: any;
}
