/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { PluginInitializerContext } from 'src/core/server';
import {
  noteSavedObjectType,
  pinnedEventSavedObjectType,
  timelineSavedObjectType,
} from './saved_objects';

import { rulesAlertType } from './lib/detection_engine/alerts/rules_alert_type';
import { isAlertExecutor } from './lib/detection_engine/alerts/types';
import { createRulesRoute } from './lib/detection_engine/routes/create_rules_route';
import { readRulesRoute } from './lib/detection_engine/routes/read_rules_route';
import { findRulesRoute } from './lib/detection_engine/routes/find_rules_route';
import { deleteRulesRoute } from './lib/detection_engine/routes/delete_rules_route';
import { updateRulesRoute } from './lib/detection_engine/routes/update_rules_route';
import { ServerFacade } from './types';

const APP_ID = 'siem';

export const initServerWithKibana = (
  context: PluginInitializerContext,
  { config, plugins: { alerting, xpack_main }, route }: ServerFacade
) => {
  const logger = context.logger.get('plugins', APP_ID);
  const version = context.env.packageInfo.version;

  if (alerting != null) {
    const type = rulesAlertType({ logger, version });
    if (isAlertExecutor(type)) {
      alerting.setup.registerType(type);
    }
  }

  // Signals/Alerting Rules routes for
  // routes such as ${DETECTION_ENGINE_RULES_URL}
  // that have the REST endpoints of /api/detection_engine/rules
  createRulesRoute(route);
  readRulesRoute(route);
  updateRulesRoute(route);
  deleteRulesRoute(route);
  findRulesRoute(route);

  xpack_main.registerFeature({
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
