/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Request, Server } from '@hapi/hapi';
import { PLUGIN } from '../common/constants';
import { KibanaTelemetryAdapter } from './lib/adapters/telemetry';
import { compose } from './lib/compose/kibana';
import { initUptimeServer } from './uptime_server';

export interface KibanaRouteOptions {
  path: string;
  method: string;
  vhost?: string | string[];
  handler: (request: Request) => any;
  options: any;
}

export interface KibanaServer extends Server {
  route: (options: KibanaRouteOptions) => void;
  usage: {
    collectorSet: {
      register: (usageCollector: any) => any;
    };
  };
}

export const initServerWithKibana = (server: KibanaServer) => {
  const libs = compose(server);
  server.usage.collectorSet.register(KibanaTelemetryAdapter.initUsageCollector(server));
  initUptimeServer(libs);

  const xpackMainPlugin = server.plugins.xpack_main;
  xpackMainPlugin.registerFeature({
    id: PLUGIN.ID,
    name: i18n.translate('xpack.uptime.featureRegistry.uptimeFeatureName', {
      defaultMessage: 'Uptime',
    }),
    navLinkId: PLUGIN.ID,
    icon: 'uptimeApp',
    app: ['uptime', 'kibana'],
    catalogue: ['uptime'],
    privileges: {
      all: {
        api: ['uptime'],
        savedObject: {
          all: [],
          read: [],
        },
        ui: ['save'],
      },
      read: {
        api: ['uptime'],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
    },
  });
};
