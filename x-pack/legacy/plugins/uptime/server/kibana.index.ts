/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Request, Server } from 'hapi';
import { PLUGIN } from '../common/constants';
import { KibanaTelemetryAdapter } from './lib/adapters/telemetry';
import { compose } from './lib/compose/kibana';
import { initUptimeServer } from './uptime_server';
import { UptimeCorePlugins, UptimeCoreSetup } from './lib/adapters/framework';

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

export const initServerWithKibana = (server: UptimeCoreSetup, plugins: UptimeCorePlugins) => {
  const { usageCollector, xpack } = plugins;
  const libs = compose(
    server,
    plugins
  );
  usageCollector.collectorSet.register(KibanaTelemetryAdapter.initUsageCollector(usageCollector));
  initUptimeServer(libs);

  xpack.registerFeature({
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
