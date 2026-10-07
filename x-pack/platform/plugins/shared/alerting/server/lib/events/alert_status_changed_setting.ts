/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type { CoreSetup, CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
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
            'Lets workflows start when an alert from a rule in this space becomes active or recovered, using the alerting.v1.alertStatusChanged trigger. While this is off, no alert status events are published and workflows using that trigger never run. Events are sent for every status change, even when the rule or alert is snoozed, muted, or in a maintenance window. Workflows started by this trigger run with the API key of the rule that raised the alert, so turning this on lets anyone who can create workflows in this space act with the privileges of the user who owns that rule. Rule names, tags, and ids from each event are also written to the workflow trigger log, which users with workflow execution read access in this space can view.',
        }
      ),
      category: ['alerting'],
      requiresPageReload: false,
      experimental: true,
      schema: schema.boolean(),
    },
  });
};

interface IsAlertStatusWorkflowTriggerEnabledOptions {
  uiSettings: CoreStart['uiSettings'];
  savedObjects: CoreStart['savedObjects'];
  request: KibanaRequest;
  logger: Logger;
}

/**
 * Reads the per-space setting for the space of the given request. The server UI settings client
 * serves repeated reads for a space from a short-lived shared cache, so calling this on every
 * rule run picks up changes without a saved-object read each time.
 *
 * The saved objects client skips the security extension, the same way the rules client does for
 * its own setting reads. The rule's API key may not be allowed to read the config saved object,
 * and a forbidden read would silently fall back to the default. It is still scoped to the
 * request's space. Any failure to read is treated as "off".
 */
export const isAlertStatusWorkflowTriggerEnabled = async ({
  uiSettings,
  savedObjects,
  request,
  logger,
}: IsAlertStatusWorkflowTriggerEnabledOptions): Promise<boolean> => {
  try {
    const savedObjectsClient = savedObjects.getScopedClient(request, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });
    const uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
    return (await uiSettingsClient.get<boolean>(ALERT_STATUS_WORKFLOW_TRIGGER_SETTING_ID)) === true;
  } catch (e) {
    logger.warn(
      `Unable to read "${ALERT_STATUS_WORKFLOW_TRIGGER_SETTING_ID}" advanced setting, treating it as disabled: ${e}`
    );
    return false;
  }
};
