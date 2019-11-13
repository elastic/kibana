/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Legacy } from 'kibana';
import { SavedObjectsClientContract } from 'kibana/server';
import { ServerRoute } from 'hapi';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { XPackMainPlugin } from '../../../xpack_main/xpack_main';

export type RegisterRoute = (args: ServerRoute) => void;

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
  };
  route: RegisterRoute;
  log: any;
  events: any;
  savedObjects: Legacy.SavedObjectsService;
}

export interface RequestShim {
  headers: { [key: string]: string };
  payload: any;
  params: any;
  // May not exist in tests, flagging it as possible null here.
  getSavedObjectsClient: (() => SavedObjectsClientContract) | null;
}
