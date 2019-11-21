/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { Logger, EnvironmentMode } from 'src/core/server';
import { initServer } from './init_server';
import { compose } from './lib/compose/kibana';
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
import { ServerFacade } from './types';

const APP_ID = 'siem';

export const initServerWithKibana = (
  kbnServer: ServerFacade,
  logger: Logger,
  mode: EnvironmentMode
) => {
  if (kbnServer.plugins.alerting != null) {
    const type = signalsAlertType({ logger });
    if (isAlertExecutor(type)) {
      kbnServer.plugins.alerting.setup.registerType(type);
    }
  }
  kbnServer.injectUiAppVars('siem', async () => kbnServer.getInjectedUiAppVars('kibana'));

  const libs = compose(kbnServer, mode);
  initServer(libs);
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
