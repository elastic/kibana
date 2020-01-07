/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { resolve } from 'path';
// import { i18n } from '@kbn/i18n';
import { PLUGIN } from './common/constants';
import { CONFIG_PREFIX } from './common/constants/plugin';
import { initServerWithKibana } from './server/kibana.index';
import { mappings } from './server/mappings';

export const config = Joi.object({
  enabled: Joi.boolean().default(true),
  encryptionKey: Joi.string().default('xpack_fleet_default_encryptionKey'),
}).default();

export function fleet(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    require: ['kibana', 'elasticsearch', 'xpack_main', 'encryptedSavedObjects', 'ingest'],
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      // app: {
      //   title: 'Elastic Fleet',
      //   description: i18n.translate('xpack.fleet.elasticFleetDescription', {
      //     defaultMessage: 'Manage your elastic data ingestion stack',
      //   }),
      //   main: 'plugins/fleet/index',
      //   icon: 'plugins/fleet/icon.svg',
      //   euiIconType: 'apmApp',
      //   order: 8000,
      // },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      managementSections: ['plugins/fleet'],
      savedObjectSchemas: {
        agents: {
          isNamespaceAgnostic: true,
          // TODO https://github.com/elastic/kibana/issues/46373
          // indexPattern: INDEX_NAMES.FLEET,
        },
        events: {
          isNamespaceAgnostic: true,
          // TODO https://github.com/elastic/kibana/issues/46373
          // indexPattern: INDEX_NAMES.EVENT,
        },
        enrollment_api_keys: {
          isNamespaceAgnostic: true,
          // TODO https://github.com/elastic/kibana/issues/46373
          // indexPattern: INDEX_NAMES.FLEET,
        },
      },
      mappings,
    },
    config: () => config,
    configPrefix: CONFIG_PREFIX,
    init(server: any) {
      // TODO https://github.com/elastic/kibana/issues/53199
      // server.newPlatform.setup.plugins.encryptedSavedObjects.registerType({
      //   type: 'enrollment_api_keys',
      //   // attributesToEncrypt: new Set(['api_key']),
      //   attributesToEncrypt: new Set([]),
      //   attributesToExcludeFromAAD: new Set(['enrollment_rules']),
      // });
      server.plugins.xpack_main.registerFeature({
        id: 'fleet',
        name: 'Fleet',
        app: ['fleet', 'kibana'],
        excludeFromBasePrivileges: true,
        privileges: {
          all: {
            savedObject: {
              all: ['agents', 'events', 'enrollment_api_keys'],
              read: [],
            },
            ui: ['read', 'write'],
            api: ['fleet-read', 'fleet-all'],
          },
          read: {
            savedObject: {
              all: [],
              read: ['agents', 'events', 'enrollment_api_keys'],
            },
            ui: ['read'],
            api: ['fleet-read'],
          },
        },
      });
      initServerWithKibana(server);
    },
  });
}
