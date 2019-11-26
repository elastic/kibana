/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { CoreSetup, Logger } from 'src/core/server';
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
import { readRulesRoute } from './lib/detection_engine/routes/read_rules_route';
import { findRulesRoute } from './lib/detection_engine/routes/find_rules_route';
import { deleteRulesRoute } from './lib/detection_engine/routes/delete_rules_route';
import { updateRulesRoute } from './lib/detection_engine/routes/update_rules_route';
import { ServerFacade } from './types';

const APP_ID = 'siem';

export const initServerWithKibana = (
  core: CoreSetup,
  { config, plugins: { alerting, xpack_main }, route }: ServerFacade,
  logger: Logger
) => {
  const version = config().get<string>('pkg.version');

  if (alerting != null) {
    const type = rulesAlertType({ logger, version });
    if (isAlertExecutor(type)) {
      alerting.setup.registerType(type);
    }
  }

  const libs = compose(core, config, version);
  initServer(libs);

  if (
    config().has('xpack.actions.enabled') &&
    config().get('xpack.actions.enabled') === true &&
    config().has('xpack.alerting.enabled') &&
    config().get('xpack.alerting.enabled') === true
  ) {
    logger.info(
      'Detected feature flags for actions and alerting and enabling detection engine API endpoints'
    );
    createRulesRoute({ route });
    readRulesRoute({ route });
    updateRulesRoute({ route });
    deleteRulesRoute({ route });
    findRulesRoute({ route });
  }

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
