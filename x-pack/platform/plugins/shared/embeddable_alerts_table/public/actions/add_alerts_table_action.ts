/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { openConfigEditor } from '../components/open_config_editor';
import { ADD_ALERTS_TABLE_ACTION_ID, EMBEDDABLE_ALERTS_TABLE_ID } from '../constants';
import { ADD_ALERTS_TABLE_ACTION_LABEL } from '../translations';
import { getInternalRuleTypesWithCache } from '../utils/get_internal_rule_types_with_cache';

const checkRuleTypesPermissions = async (http: CoreStart['http']) => {
  try {
    const ruleTypes = await getInternalRuleTypesWithCache(http);
    // If the user can access at least one rule type (with any authorizedConsumer, in any app) then
    // they can create alerts visualizations
    return Boolean(ruleTypes.length);
  } catch (error) {
    return false;
  }
};

export const getAddAlertsTableAction = (
  coreServices: CoreStart
): ActionDefinition<EmbeddableApiContext> => {
  const { http } = coreServices;
  return {
    id: ADD_ALERTS_TABLE_ACTION_ID,
    grouping: [ADD_PANEL_VISUALIZATION_GROUP],
    getIconType: () => 'bell',
    isCompatible: async ({ embeddable }) => {
      const hasAccessToAnyRuleTypes = await checkRuleTypesPermissions(http);
      return apiIsPresentationContainer(embeddable) && hasAccessToAnyRuleTypes;
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      const tableConfig = await openConfigEditor({
        coreServices,
        parentApi: embeddable,
      });
      await embeddable.addNewPanel(
        {
          panelType: EMBEDDABLE_ALERTS_TABLE_ID,
          serializedState: { rawState: { tableConfig } },
        },
        true
      );
    },
    getDisplayName: () => ADD_ALERTS_TABLE_ACTION_LABEL,
  };
};
