/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { CoreSetup, IUiSettingsClient, Logger } from '@kbn/core/server';
import { ALERT_STATUS_WORKFLOW_TRIGGER_SETTING_ID } from '../../../common/workflows';

export const registerAlertStatusWorkflowTriggerSetting = (uiSettings: CoreSetup['uiSettings']) => {
  uiSettings.register({
    [ALERT_STATUS_WORKFLOW_TRIGGER_SETTING_ID]: {
      name: i18n.translate('xpack.alerting.uiSettings.alertStatusWorkflowTriggerName', {
        defaultMessage: 'Alert status workflow trigger',
      }),
      value: false,
      type: 'boolean',
      description: i18n.translate(
        'xpack.alerting.uiSettings.alertStatusWorkflowTriggerDescription',
        {
          defaultMessage:
            'Lets workflows start when an alert from a rule in this space becomes active or recovered, using the alerting.v1.alertStatusChanged trigger. While this is off, no alert status events are published and workflows using that trigger never run.',
        }
      ),
      category: ['alerting'],
      requiresPageReload: false,
      experimental: true,
      schema: schema.boolean(),
    },
  });
};

/**
 * Reads the per-space setting. The server UI settings client serves repeated reads for a space
 * from a short-lived shared cache, so calling this on every rule run picks up changes without
 * a saved-object read each time. Any failure to read is treated as "off".
 */
export const isAlertStatusWorkflowTriggerEnabled = async (
  uiSettingsClient: IUiSettingsClient,
  logger: Logger
): Promise<boolean> => {
  try {
    return (await uiSettingsClient.get<boolean>(ALERT_STATUS_WORKFLOW_TRIGGER_SETTING_ID)) === true;
  } catch (e) {
    logger.warn(
      `Unable to read "${ALERT_STATUS_WORKFLOW_TRIGGER_SETTING_ID}" advanced setting, treating it as disabled: ${e}`
    );
    return false;
  }
};
