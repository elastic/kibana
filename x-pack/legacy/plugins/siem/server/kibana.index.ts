/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Server } from 'hapi';

import KbnServer from 'src/legacy/server/kbn_server';
import { initServer } from './init_server';
import { compose } from './lib/compose/kibana';
import { createLogger } from './utils/logger';
import {
  noteSavedObjectType,
  pinnedEventSavedObjectType,
  timelineSavedObjectType,
} from './saved_objects';

import { signalsAlertType } from './lib/detection_engine/alerts/signals_alert_type';
import { isAlertExecutor } from './lib/detection_engine/alerts/types';
import { createSignalsRoute } from './lib/detection_engine/routes/create_signals_route';
import { readSignalsRoute } from './lib/detection_engine/routes/read_signals_route';
import { findSignalsRoute } from './lib/detection_engine/routes/find_signals_route';
import { deleteSignalsRoute } from './lib/detection_engine/routes/delete_signals_route';
import { updateSignalsRoute } from './lib/detection_engine/routes/update_signals_route';

const APP_ID = 'siem';

export const amMocking = (): boolean => process.env.INGEST_MOCKS === 'true';

export const initServerWithKibana = (kbnServer: Server) => {
  const newPlatform = ((kbnServer as unknown) as KbnServer).newPlatform;
  if (kbnServer.plugins.alerting != null) {
    const type = signalsAlertType({
      logger: newPlatform.coreContext.logger.get('plugins', APP_ID),
    });
    if (isAlertExecutor(type)) {
      kbnServer.plugins.alerting.setup.registerType(type);
    }
  }
  kbnServer.injectUiAppVars('siem', async () => kbnServer.getInjectedUiAppVars('kibana'));

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
  if (
    kbnServer.config().has('xpack.actions.enabled') &&
    kbnServer.config().get('xpack.actions.enabled') === true &&
    kbnServer.config().has('xpack.alerting.enabled') &&
    kbnServer.config().has('xpack.alerting.enabled') === true
  ) {
    logger.info(
      'Detected feature flags for actions and alerting and enabling signals API endpoints'
    );
    createSignalsRoute(kbnServer);
    readSignalsRoute(kbnServer);
    updateSignalsRoute(kbnServer);
    deleteSignalsRoute(kbnServer);
    findSignalsRoute(kbnServer);
  }
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
