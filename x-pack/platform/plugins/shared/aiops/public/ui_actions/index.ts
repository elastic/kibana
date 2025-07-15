/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type UiActionsSetup, ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import {
  categorizeFieldTrigger,
  CATEGORIZE_FIELD_TRIGGER,
} from '@kbn/ml-ui-actions/src/aiops/ui_actions';
import type { CoreStart } from '@kbn/core/public';
import type { AiopsPluginStartDeps } from '../types';

export function registerAiopsUiActions(
  uiActions: UiActionsSetup,
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps
) {
  uiActions.addTriggerActionAsync(
    ADD_PANEL_TRIGGER,
    'create-pattern-analysis-embeddable',
    async () => {
      const { createAddPatternAnalysisEmbeddableAction } = await import(
        './create_pattern_analysis_action'
      );
      const addPatternAnalysisAction = createAddPatternAnalysisEmbeddableAction(
        coreStart,
        pluginStart
      );
      return addPatternAnalysisAction;
    }
  );
  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, 'create-change-point-chart', async () => {
    const { createAddChangePointChartAction } = await import('./create_change_point_chart');
    const addChangePointChartAction = createAddChangePointChartAction(coreStart, pluginStart);
    return addChangePointChartAction;
  });

  uiActions.registerTrigger(categorizeFieldTrigger);

  uiActions.addTriggerActionAsync(CATEGORIZE_FIELD_TRIGGER, 'ACTION_CATEGORIZE_FIELD', async () => {
    const { createCategorizeFieldAction } = await import(
      '../components/log_categorization/categorize_field_actions'
    );
    return createCategorizeFieldAction(coreStart, pluginStart);
  });

  uiActions.addTriggerActionAsync(CONTEXT_MENU_TRIGGER, 'open-change-point-in-ml-app', async () => {
    const { createOpenChangePointInMlAppAction } = await import('./open_change_point_ml');
    const openChangePointInMlAppAction = createOpenChangePointInMlAppAction(coreStart, pluginStart);
    return openChangePointInMlAppAction;
  });

  uiActions.addTriggerActionAsync(
    ADD_PANEL_TRIGGER,
    'create-log-rate-analysis-embeddable',
    async () => {
      const { createAddLogRateAnalysisEmbeddableAction } = await import(
        './create_log_rate_analysis_actions'
      );
      const addLogRateAnalysisAction = createAddLogRateAnalysisEmbeddableAction(
        coreStart,
        pluginStart
      );
      return addLogRateAnalysisAction;
    }
  );
}
