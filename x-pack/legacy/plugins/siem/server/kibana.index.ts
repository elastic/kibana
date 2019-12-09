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

import { rulesAlertType } from './lib/detection_engine/alerts/rules_alert_type';
import { isAlertExecutor } from './lib/detection_engine/alerts/types';
import { createRulesRoute } from './lib/detection_engine/routes/create_rules_route';
import { createIndexRoute } from './lib/detection_engine/routes/index/create_index_route';
import { readIndexRoute } from './lib/detection_engine/routes/index/read_index_route';
import { readRulesRoute } from './lib/detection_engine/routes/read_rules_route';
import { findRulesRoute } from './lib/detection_engine/routes/find_rules_route';
import { deleteRulesRoute } from './lib/detection_engine/routes/delete_rules_route';
import { updateRulesRoute } from './lib/detection_engine/routes/update_rules_route';
import { setSignalsStatusRoute } from './lib/detection_engine/routes/signals/open_close_signals_route';
import { ServerFacade } from './types';
import { deleteIndexRoute } from './lib/detection_engine/routes/index/delete_index_route';

const APP_ID = 'siem';

export const initServerWithKibana = (
  kbnServer: ServerFacade,
  logger: Logger,
  mode: EnvironmentMode
) => {
  if (kbnServer.plugins.alerting != null) {
    const version = kbnServer.config().get<string>('pkg.version');
    const type = rulesAlertType({ logger, version });
    if (isAlertExecutor(type)) {
      kbnServer.plugins.alerting.setup.registerType(type);
    }
  }
  kbnServer.injectUiAppVars('siem', async () => kbnServer.getInjectedUiAppVars('kibana'));

  const libs = compose(kbnServer, mode);
  initServer(libs);

  // Detection Engine Rule routes that have the REST endpoints of /api/detection_engine/rules
  // All REST rule creation, deletion, updating, etc...
  createRulesRoute(kbnServer);
  readRulesRoute(kbnServer);
  updateRulesRoute(kbnServer);
  deleteRulesRoute(kbnServer);
  findRulesRoute(kbnServer);

  // Detection Engine Signals routes that have the REST endpoints of /api/detection_engine/signals
  // POST /api/detection_engine/signals/status
  // Example usage can be found in siem/server/lib/detection_engine/scripts/signals
  setSignalsStatusRoute(kbnServer);

  // Detection Engine index routes that have the REST endpoints of /api/detection_engine/index
  // All REST index creation, policy management for spaces
  createIndexRoute(kbnServer);
  readIndexRoute(kbnServer);
  deleteIndexRoute(kbnServer);

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
