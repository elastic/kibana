/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import {
  IncompatibleActionError,
  UiActionsStart,
  ADD_PANEL_TRIGGER,
} from '@kbn/ui-actions-plugin/public';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import { fetchRuleTypes } from '@kbn/alerts-ui-shared/src/common/apis/fetch_rule_types';
import { ALERTS_FEATURE_ID } from '@kbn/alerts-ui-shared/src/common/constants';
import { CREATE_ALERTS_TABLE_ACTION_ID, EMBEDDABLE_ALERTS_TABLE_ID } from './constants';

export const registerCreateAlertsTableAction = ({ http }: CoreStart, uiActions: UiActionsStart) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: CREATE_ALERTS_TABLE_ACTION_ID,
    grouping: [ADD_PANEL_VISUALIZATION_GROUP],
    getIconType: () => 'bell',
    isCompatible: async ({ embeddable }) => {
      try {
        const ruleTypes = await fetchRuleTypes({ http });
        if (
          // If the current user is not authorized to read any rule
          !ruleTypes.length ||
          !ruleTypes.some((ruleType) => {
            const alertsConsumer = ruleType.authorizedConsumers[ALERTS_FEATURE_ID];
            return alertsConsumer?.all || alertsConsumer?.read;
          })
        ) {
          // Disable the panel creation action
          return false;
        }
      } catch (error) {
        return false;
      }
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      embeddable.addNewPanel(
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

  uiActions.attachAction(ADD_PANEL_TRIGGER, CREATE_ALERTS_TABLE_ACTION_ID);
};
