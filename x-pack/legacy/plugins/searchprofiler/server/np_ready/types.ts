/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerRoute } from 'hapi';
import { ElasticsearchPlugin, Request } from 'src/legacy/core_plugins/elasticsearch';
import { XPackMainPlugin } from '../../../xpack_main/server/xpack_main';

export type RegisterRoute = (args: ServerRoute & { config: any }) => void;

export interface LegacyPlugins {
  __LEGACY: {
    thisPlugin: any;
    elasticsearch: ElasticsearchPlugin;
    xpackMain: XPackMainPlugin;
    commonRouteConfig: any;
  };
}

export interface LegacySetup {
  route: RegisterRoute;
  plugins: LegacyPlugins;
}

export interface ServerShim {
  elasticsearch: ElasticsearchPlugin;
}

export interface RequestShim extends Request {
  payload: any;
}
