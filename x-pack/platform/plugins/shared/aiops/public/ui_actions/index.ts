/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import {
  ADD_PANEL_TRIGGER,
  CATEGORIZE_FIELD_TRIGGER,
  ON_OPEN_PANEL_MENU,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { AiopsCoreSetup } from '../plugin';

export function registerAiopsUiActions(uiActions: UiActionsSetup, core: AiopsCoreSetup) {
  uiActions.addTriggerActionAsync(
    ADD_PANEL_TRIGGER,
    'create-pattern-analysis-embeddable',
    async () => {
      const [{ createAddPatternAnalysisEmbeddableAction }, [coreStart, pluginStart]] =
        await Promise.all([import('./actions'), core.getStartServices()]);
      const addPatternAnalysisAction = createAddPatternAnalysisEmbeddableAction(
        coreStart,
        pluginStart
      );
      return addPatternAnalysisAction;
    }
  );
  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, 'create-change-point-chart', async () => {
    const [{ createAddChangePointChartAction }, [coreStart, pluginStart]] = await Promise.all([
      import('./actions'),
      core.getStartServices(),
    ]);
    const addChangePointChartAction = createAddChangePointChartAction(coreStart, pluginStart);
    return addChangePointChartAction;
  });

  uiActions.addTriggerActionAsync(CATEGORIZE_FIELD_TRIGGER, 'ACTION_CATEGORIZE_FIELD', async () => {
    const [{ createCategorizeFieldAction }, [coreStart, pluginStart]] = await Promise.all([
      import('./actions'),
      core.getStartServices(),
    ]);
    return createCategorizeFieldAction(coreStart, pluginStart);
  });

  uiActions.addTriggerActionAsync(ON_OPEN_PANEL_MENU, 'open-change-point-in-ml-app', async () => {
    const [{ createOpenChangePointInMlAppAction }, [coreStart, pluginStart]] = await Promise.all([
      import('./actions'),
      core.getStartServices(),
    ]);
    const openChangePointInMlAppAction = createOpenChangePointInMlAppAction(coreStart, pluginStart);
    return openChangePointInMlAppAction;
  });

  uiActions.addTriggerActionAsync(
    ADD_PANEL_TRIGGER,
    'create-log-rate-analysis-embeddable',
    async () => {
      const [{ createAddLogRateAnalysisEmbeddableAction }, [coreStart, pluginStart]] =
        await Promise.all([import('./actions'), core.getStartServices()]);
      const addLogRateAnalysisAction = createAddLogRateAnalysisEmbeddableAction(
        coreStart,
        pluginStart
      );
      return addLogRateAnalysisAction;
    }
  );
}
