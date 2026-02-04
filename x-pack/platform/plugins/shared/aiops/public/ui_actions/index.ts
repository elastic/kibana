/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import {
  ADD_PANEL_TRIGGER,
  CATEGORIZE_FIELD_TRIGGER,
  CONTEXT_MENU_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
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
      const { createAddPatternAnalysisEmbeddableAction } = await import('./actions');
      const addPatternAnalysisAction = createAddPatternAnalysisEmbeddableAction(
        coreStart,
        pluginStart
      );
      return addPatternAnalysisAction;
    }
  );
  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, 'create-change-point-chart', async () => {
    const { createAddChangePointChartAction } = await import('./actions');
    const addChangePointChartAction = createAddChangePointChartAction(coreStart, pluginStart);
    return addChangePointChartAction;
  });

  uiActions.addTriggerActionAsync(CATEGORIZE_FIELD_TRIGGER, 'ACTION_CATEGORIZE_FIELD', async () => {
    const { createCategorizeFieldAction } = await import('./actions');
    return createCategorizeFieldAction(coreStart, pluginStart);
  });

  uiActions.addTriggerActionAsync(CONTEXT_MENU_TRIGGER, 'open-change-point-in-ml-app', async () => {
    const { createOpenChangePointInMlAppAction } = await import('./actions');
    const openChangePointInMlAppAction = createOpenChangePointInMlAppAction(coreStart, pluginStart);
    return openChangePointInMlAppAction;
  });

  uiActions.addTriggerActionAsync(
    ADD_PANEL_TRIGGER,
    'create-log-rate-analysis-embeddable',
    async () => {
      const { createAddLogRateAnalysisEmbeddableAction } = await import('./actions');
      const addLogRateAnalysisAction = createAddLogRateAnalysisEmbeddableAction(
        coreStart,
        pluginStart
      );
      return addLogRateAnalysisAction;
    }
  );
}
