/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import { getRuleTypes } from '@kbn/response-ops-rules-apis/apis/get_rule_types';
import { ALERTS_FEATURE_ID } from '@kbn/alerts-ui-shared/src/common/constants';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { ADD_ALERTS_TABLE_ACTION_ID, EMBEDDABLE_ALERTS_TABLE_ID } from '../constants';

const checkRuleTypesPermissions = async (http: CoreStart['http']) => {
  try {
    const ruleTypes = await getRuleTypes({ http });
    if (!ruleTypes.length) {
      // If no rule types we should not show the action.
      return false;
    }
    const isAuthorized = ruleTypes.some((ruleType) => {
      const alertsConsumer = ruleType.authorizedConsumers[ALERTS_FEATURE_ID];
      return alertsConsumer?.all || alertsConsumer?.read;
    });
    if (isAuthorized) {
      // If at least one rule type is authorized we should show the action
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

export const getAddAlertsTableAction = ({
  http,
}: {
  http: CoreStart['http'];
}): ActionDefinition<EmbeddableApiContext> => ({
  id: ADD_ALERTS_TABLE_ACTION_ID,
  grouping: [ADD_PANEL_VISUALIZATION_GROUP],
  getIconType: () => 'bell',
  isCompatible: async ({ embeddable }) => {
    const hasAccessToAnyRuleTypes = await checkRuleTypesPermissions(http);
    return apiIsPresentationContainer(embeddable) && hasAccessToAnyRuleTypes;
  },
  execute: async ({ embeddable }) => {
    if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
    await embeddable.addNewPanel(
      {
        panelType: EMBEDDABLE_ALERTS_TABLE_ID,
      },
      true
    );
  },
  getDisplayName: () =>
    i18n.translate('xpack.embeddableAlertsTable.ariaLabel', {
      defaultMessage: 'Alerts table',
    }),
});
