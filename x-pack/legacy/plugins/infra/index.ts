/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import JoiNamespace from 'joi';
import { resolve } from 'path';
import { PluginInitializerContext } from 'src/core/server';
import KbnServer from 'src/legacy/server/kbn_server';
import { Observable } from 'rxjs';
import { getConfigSchema } from './server/kibana.index';
import { savedObjectMappings } from './server/saved_objects';
import { plugin } from './server/new_platform_index';

const APP_ID = 'infra';
const logsSampleDataLinkLabel = i18n.translate('xpack.infra.sampleDataLinkLabel', {
  defaultMessage: 'Logs',
});

export function infra(kibana: any) {
  return new kibana.Plugin({
    id: APP_ID,
    configPrefix: 'xpack.infra',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'metrics'],
    uiExports: {
      app: {
        description: i18n.translate('xpack.infra.infrastructureDescription', {
          defaultMessage: 'Explore your metrics',
        }),
        icon: 'plugins/infra/images/infra_mono_white.svg',
        main: 'plugins/infra/app',
        title: i18n.translate('xpack.infra.infrastructureTitle', {
          defaultMessage: 'Metrics',
        }),
        listed: false,
        url: `/app/${APP_ID}#/infrastructure`,
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      home: ['plugins/infra/register_feature'],
      links: [
        {
          description: i18n.translate('xpack.infra.linkInfrastructureDescription', {
            defaultMessage: 'Explore your metrics',
          }),
          icon: 'plugins/infra/images/infra_mono_white.svg',
          euiIconType: 'infraApp',
          id: 'infra:home',
          order: 8000,
          title: i18n.translate('xpack.infra.linkInfrastructureTitle', {
            defaultMessage: 'Metrics',
          }),
          url: `/app/${APP_ID}#/infrastructure`,
        },
        {
          description: i18n.translate('xpack.infra.linkLogsDescription', {
            defaultMessage: 'Explore your logs',
          }),
          icon: 'plugins/infra/images/logging_mono_white.svg',
          euiIconType: 'loggingApp',
          id: 'infra:logs',
          order: 8001,
          title: i18n.translate('xpack.infra.linkLogsTitle', {
            defaultMessage: 'Logs',
          }),
          url: `/app/${APP_ID}#/logs`,
        },
      ],
      mappings: savedObjectMappings,
    },
    config(Joi: typeof JoiNamespace) {
      return getConfigSchema(Joi);
    },
    init(server: any) {
      // convert hapi instance to KbnServer
      // `kbnServer.server` is the same hapi instance
      // `kbnServer.newPlatform` has important values
      const kbnServer = (server as unknown) as KbnServer;
      const { core } = kbnServer.newPlatform.setup;

      const getConfig$ = <T>() =>
        new Observable<T>(observer => {
          server
            .config()
            .get('xpack.infra')
            .then((value: T) => observer.next(value));
        });

      const initContext = {
        config: {
          create: getConfig$,
          createIfExists: getConfig$,
        },
      } as PluginInitializerContext;

      plugin(initContext).setup(core);

      // NP_TODO: How do we move this to new platform?
      server.addAppLinksToSampleDataset('logs', [
        {
          path: `/app/${APP_ID}#/logs`,
          label: logsSampleDataLinkLabel,
          icon: 'loggingApp',
        },
      ]);
    },
  });
}
