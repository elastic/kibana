/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Server } from 'hapi';

import { initServer } from './init_server';
import { compose } from './lib/compose/kibana';
import { createLogger } from './utils/logger';
import {
  noteSavedObjectType,
  pinnedEventSavedObjectType,
  timelineSavedObjectType,
} from './saved_objects';

const APP_ID = 'siem';

export const amMocking = (): boolean => process.env.INGEST_MOCKS === 'true';

export const initServerWithKibana = (kbnServer: Server) => {
  // bind is so "this" binds correctly to the logger since hapi server does not auto-bind its methods
  const logger = createLogger(kbnServer.log.bind(kbnServer));
  logger.info('Plugin initializing');

  const mocking = amMocking();
  if (mocking) {
    logger.info(
      `Mocks for ${APP_ID} is activated. No real ${APP_ID} data will be used, only mocks will be used.`
    );
  }

  const libs = compose(kbnServer);
  initServer(libs, { mocking, logger });

  logger.info('Plugin done initializing');

  const xpackMainPlugin = kbnServer.plugins.xpack_main;
  xpackMainPlugin.registerFeature({
    id: APP_ID,
    name: i18n.translate('xpack.siem.featureRegistry.linkSiemTitle', {
      defaultMessage: 'SIEM',
    }),
    icon: 'securityAnalyticsApp',
    navLinkId: 'siem',
    app: ['siem', 'kibana'],
    catalogue: ['siem'],
    privileges: {
      all: {
        api: ['siem'],
        savedObject: {
          all: [noteSavedObjectType, pinnedEventSavedObjectType, timelineSavedObjectType],
          read: ['config'],
        },
        ui: ['show'],
      },
      read: {
        api: ['siem'],
        savedObject: {
          all: [],
          read: [
            'config',
            noteSavedObjectType,
            pinnedEventSavedObjectType,
            timelineSavedObjectType,
          ],
        },
        ui: ['show'],
      },
    },
  });
};
