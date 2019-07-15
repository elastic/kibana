/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Server } from 'hapi';
import { resolve } from 'path';
import {
  InternalCoreSetup,
  PluginInitializerContext
} from '../../../../src/core/server';
import { LegacyPluginInitializer } from '../../../../src/legacy/types';
import mappings from './mappings.json';
import { plugin } from './server/new-platform/index';
import { TaskManager, RunContext } from '../legacy/plugins/task_manager';
import { serviceMapRun } from './server/lib/servicemap';

export const apm: LegacyPluginInitializer = kibana => {
  return new kibana.Plugin({
    require: [
      'kibana',
      'elasticsearch',
      'xpack_main',
      'apm_oss',
      'task_manager'
    ],
    id: 'apm',
    configPrefix: 'xpack.apm',
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      app: {
        title: 'APM',
        description: i18n.translate('xpack.apm.apmForESDescription', {
          defaultMessage: 'APM for the Elastic Stack'
        }),
        main: 'plugins/apm/index',
        icon: 'plugins/apm/icon.svg',
        euiIconType: 'apmApp',
        order: 8100
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      home: ['plugins/apm/register_feature'],

      // TODO: get proper types
      injectDefaultVars(server: Server) {
        const config = server.config();
        return {
          apmUiEnabled: config.get('xpack.apm.ui.enabled'),
          apmIndexPatternTitle: config.get('apm_oss.indexPattern') // TODO: rename to apm_oss.indexPatternTitle in 7.0 (breaking change)
        };
      },
      hacks: ['plugins/apm/hacks/toggle_app_link_in_nav'],
      savedObjectSchemas: {
        'apm-telemetry': {
          isNamespaceAgnostic: true
        }
      },
      mappings
    },

    // TODO: get proper types
    config(Joi: any) {
      return Joi.object({
        // display menu item
        ui: Joi.object({
          enabled: Joi.boolean().default(true),
          transactionGroupBucketSize: Joi.number().default(100)
        }).default(),

        // enable plugin
        enabled: Joi.boolean().default(true),

        // buckets
        minimumBucketSize: Joi.number().default(15),
        bucketTargetCount: Joi.number().default(27)
      }).default();
    },

    // TODO: get proper types
    init(server: Server) {
      server.plugins.xpack_main.registerFeature({
        id: 'apm',
        name: i18n.translate('xpack.apm.featureRegistry.apmFeatureName', {
          defaultMessage: 'APM'
        }),
        icon: 'apmApp',
        navLinkId: 'apm',
        app: ['apm', 'kibana'],
        catalogue: ['apm'],
        privileges: {
          all: {
            api: ['apm'],
            catalogue: ['apm'],
            savedObject: {
              all: [],
              read: []
            },
            ui: ['show', 'save']
          },
          read: {
            api: ['apm'],
            catalogue: ['apm'],
            savedObject: {
              all: [],
              read: []
            },
            ui: ['show']
          }
        }
      });

      // fires off the job
      // needed this during debugging
      server.route({
        method: 'GET',
        path: '/api/apm/servicemap',
        options: {
          tags: ['access:apm']
        },
        handler: req => {
          return serviceMapRun(this.kbnServer, this.kbnServer.config);
        }
      });

      const { taskManager } = server;
      if (taskManager) {
        // console.log('registering task');
        taskManager.registerTaskDefinitions({
          // serviceMap is the task type, and must be unique across the entire system
          serviceMap: {
            // Human friendly name, used to represent this task in logs, UI, etc
            title: 'ServiceMapTask',

            // Optional, human-friendly, more detailed description
            description: 'Extract connections in traces for service maps',

            // Optional, how long, in minutes, the system should wait before
            // a running instance of this task is considered to be timed out.
            // This defaults to 5 minutes.
            timeout: '5m',

            // The serviceMap task occupies 2 workers, so if the system has 10 worker slots,
            // 5 serviceMap tasks could run concurrently per Kibana instance. This value is
            // overridden by the `override_num_workers` config value, if specified.
            numWorkers: 1,

            // The createTaskRunner function / method returns an object that is responsible for
            // performing the work of the task. context: { taskInstance, kbnServer }, is documented below.
            createTaskRunner({ kbnServer, taskInstance }: RunContext) {
              // Perform the work of the task. The return value should fit the TaskResult interface, documented
              // below. Invalid return values will result in a logged warning.
              return {
                async run() {
                  const { state } = taskInstance;

                  const { mostRecent } = await serviceMapRun(
                    kbnServer,
                    kbnServer.config,
                    state.lastRun
                  );

                  return {
                    state: {
                      count: (state.count || 0) + 1,
                      lastRun: mostRecent
                    }
                  };
                }
              };
            }
          }
        });

        this.kbnServer.afterPluginsInit(() => {
          // console.log('ahout to schedule');
          const task = taskManager.schedule({
            id: 'servicemap-processor',
            taskType: 'serviceMap',
            interval: '1m',
            scope: ['apm']
          });
          // .catch(e => console.log('Err scheduling', e));
          // console.log('scheduled', JSON.stringify(task));
        });

        const initializerContext = {} as PluginInitializerContext;
        const core = {
          http: {
            server
          }
        } as InternalCoreSetup;
        plugin(initializerContext).setup(core);
      }
    }
  });
};
