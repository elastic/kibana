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
import { umDynamicSettings } from './lib/sources';

export interface KibanaRouteOptions {
  path: string;
  method: string;
  vhost?: string | string[];
  handler: (request: Request) => any;
  options: any;
}

export interface KibanaServer extends Server {
  route: (options: KibanaRouteOptions) => void;
}

export const initServerWithKibana = (server: UptimeCoreSetup, plugins: UptimeCorePlugins) => {
  const { usageCollection, xpack } = plugins;
  const libs = compose(server, plugins);
  KibanaTelemetryAdapter.registerUsageCollector(usageCollection);

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
          all: [umDynamicSettings.type],
          read: ['index-pattern'],
        },
        ui: ['save', 'configureSource', 'show'],
      },
      read: {
        api: ['uptime'],
        savedObject: {
          all: [],
          read: ['index-pattern', umDynamicSettings.type],
        },
        ui: ['show'],
      },
    },
  });
};
