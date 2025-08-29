/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreSetup } from '@kbn/core/public';

import {
  CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_TRIGGER,
  CONTROLLED_BY_SINGLE_METRIC_VIEWER_FILTER,
} from '@kbn/ml-ui-actions';
import type { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import type { MlPluginStart } from '@kbn/ml-plugin-contracts';

import type { MlStartDependencies } from '../plugin';

// avoid importing from plugin root
// import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public/';
const CONTEXT_MENU_TRIGGER = 'CONTEXT_MENU_TRIGGER';

// avoid importing from plugin root
// import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
const ADD_PANEL_TRIGGER = 'ADD_PANEL_TRIGGER';
const ACTION_ADD_PANEL = 'ACTION_ADD_PANEL';

export const SWIM_LANE_SELECTION_TRIGGER = 'SWIM_LANE_SELECTION_TRIGGER';
export const EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER = 'EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER';
export const SINGLE_METRIC_VIEWER_ENTITY_FIELD_SELECTION_TRIGGER =
  'SINGLE_METRIC_VIEWER_ENTITY_FIELD_SELECTION_TRIGGER';

/**
 * Register ML UI actions
 */
export function registerMlUiActions(
  uiActions: UiActionsSetup,
  core: CoreSetup<MlStartDependencies, MlPluginStart>
) {
  // Register actions
  uiActions.registerActionAsync('CLEAR_SELECTION_ACTION', async () => {
    const { createClearSelectionAction } = await import('./clear_selection_action');
    const clearSelectionAction = createClearSelectionAction(core.getStartServices);
    return clearSelectionAction;
  });
  uiActions.registerActionAsync('CREATE_LENS_VIS_TO_ML_AD_JOB_ACTION', async () => {
    const { createVisToADJobAction } = await import('./open_vis_in_ml_action');
    const visToAdJobAction = createVisToADJobAction(core.getStartServices);
    return visToAdJobAction;
  });
  uiActions.registerActionAsync('APPLY_ENTITY_FIELD_FILTER_ACTION', async () => {
    const { createApplyEntityFieldFiltersAction } = await import('./apply_entity_filters_action');
    const applyEntityFieldFilterAction = createApplyEntityFieldFiltersAction(core.getStartServices);
    return applyEntityFieldFilterAction;
  });
  uiActions.registerActionAsync('SMV_APPLY_ENTITY_FIELD_FILTER_ACTION', async () => {
    const { createApplyEntityFieldFiltersAction } = await import('./apply_entity_filters_action');
    const smvApplyEntityFieldFilterAction = createApplyEntityFieldFiltersAction(
      core.getStartServices,
      CONTROLLED_BY_SINGLE_METRIC_VIEWER_FILTER
    );
    return smvApplyEntityFieldFilterAction;
  });
  uiActions.registerActionAsync('APPLY_TIME_RANGE_SELECTION_ACTION', async () => {
    const { createApplyTimeRangeSelectionAction } = await import('./apply_time_range_action');
    const applyTimeRangeSelectionAction = createApplyTimeRangeSelectionAction(
      core.getStartServices
    );
    return applyTimeRangeSelectionAction;
  });
  uiActions.registerActionAsync('CATEGORIZATION_AD_JOB_ACTION', async () => {
    const { createCategorizationADJobAction } = await import(
      './open_create_categorization_job_action'
    );
    const categorizationADJobAction = createCategorizationADJobAction(core.getStartServices);
    return categorizationADJobAction;
  });
  uiActions.registerActionAsync('ADD_ANOMALY_CHARTS_PANEL', async () => {
    const { createAddAnomalyChartsPanelAction } = await import('./create_anomaly_chart');
    const addAnomalyChartsPanelAction = createAddAnomalyChartsPanelAction(core.getStartServices);
    return addAnomalyChartsPanelAction;
  });

  // Assign triggers
  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ACTION_ADD_PANEL, async () => {
    const { createAddSingleMetricViewerPanelAction } = await import(
      './create_single_metric_viewer'
    );
    const addSingleMetricViewerPanelAction = createAddSingleMetricViewerPanelAction(
      core.getStartServices
    );
    return addSingleMetricViewerPanelAction;
  });
  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ACTION_ADD_PANEL, async () => {
    const { createAddSwimlanePanelAction } = await import('./create_swim_lane');
    const addSwimlanePanelAction = createAddSwimlanePanelAction(core.getStartServices);
    return addSwimlanePanelAction;
  });

  uiActions.addTriggerActionAsync(CONTEXT_MENU_TRIGGER, 'ACTION_CONTEXT_MENU', async () => {
    const { createOpenInExplorerAction } = await import('./open_in_anomaly_explorer_action');
    const openInExplorerAction = createOpenInExplorerAction(core.getStartServices);
    return openInExplorerAction;
  });
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, 'open-in-single-metric-viewer');

  // swimLaneSelectionTrigger
  uiActions.registerTrigger({
    id: SWIM_LANE_SELECTION_TRIGGER,
    // This is empty string to hide title of ui_actions context menu that appears
    // when this trigger is executed.
    title: '',
    description: 'Swim lane selection triggered',
  });

  // entityFieldSelectionTrigger
  uiActions.registerTrigger({
    id: EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER,
    // This is empty string to hide title of ui_actions context menu that appears
    // when this trigger is executed.
    title: '',
    description: 'Entity field selection triggered',
  });

  // smvEntityFieldSelectionTrigger
  uiActions.registerTrigger({
    id: SINGLE_METRIC_VIEWER_ENTITY_FIELD_SELECTION_TRIGGER,
    // This is empty string to hide title of ui_actions context menu that appears
    // when this trigger is executed.
    title: '',
    description: 'Single metric viewer entity field selection triggered',
  });

  // createCategorizationADJobTrigger
  uiActions.registerTrigger({
    id: CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_TRIGGER,
    title: i18n.translate('xpack.ml.actions.createADJobFromPatternAnalysis', {
      defaultMessage: 'Create categorization anomaly detection job',
    }),
    description: i18n.translate('xpack.ml.actions.createADJobFromPatternAnalysis', {
      defaultMessage: 'Create categorization anomaly detection job',
    }),
  });

  uiActions.addTriggerActionAsync(
    SWIM_LANE_SELECTION_TRIGGER,
    'ACTION_APPLY_INFLUENCER_FILTERS',
    async () => {
      const { createApplyInfluencerFiltersAction } = await import(
        './apply_influencer_filters_action'
      );
      const applyInfluencerFiltersAction = createApplyInfluencerFiltersAction(
        core.getStartServices
      );
      return applyInfluencerFiltersAction;
    }
  );
  uiActions.addTriggerActionAsync(
    SWIM_LANE_SELECTION_TRIGGER,
    'ACTION_APPLY_TIME_RANGE_SELECTION',
    async () => {
      const { createApplyTimeRangeSelectionAction } = await import('./apply_time_range_action');
      const applyTimeRangeSelectionAction = createApplyTimeRangeSelectionAction(
        core.getStartServices
      );
      return applyTimeRangeSelectionAction;
    }
  );
  uiActions.addTriggerActionAsync(
    SWIM_LANE_SELECTION_TRIGGER,
    'ACTION_OPEN_IN_EXPLORER',
    async () => {
      const { createOpenInExplorerAction } = await import('./open_in_anomaly_explorer_action');
      const openInExplorerAction = createOpenInExplorerAction(core.getStartServices);
      return openInExplorerAction;
    }
  );
  uiActions.addTriggerActionAsync(
    SWIM_LANE_SELECTION_TRIGGER,
    'ACTION_OPEN_IN_SINGLE_METRIC_VIEWER',
    async () => {
      const { createOpenInSingleMetricViewerAction } = await import(
        './open_in_single_metric_viewer_action'
      );
      const openInSingleMetricViewerAction = createOpenInSingleMetricViewerAction(
        core.getStartServices
      );
      return openInSingleMetricViewerAction;
    }
  );
  uiActions.addTriggerActionAsync(
    SWIM_LANE_SELECTION_TRIGGER,
    'CLEAR_SELECTION_ACTION',
    async () => {
      const { createClearSelectionAction } = await import('./clear_selection_action');
      const clearSelectionAction = createClearSelectionAction(core.getStartServices);
      return clearSelectionAction;
    }
  );
  uiActions.addTriggerActionAsync(
    EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER,
    'ACTION_EXPLORER_ENTITY_FIELD_SELECTION',
    async () => {
      const { createApplyEntityFieldFiltersAction } = await import('./apply_entity_filters_action');
      const applyEntityFieldFilterAction = createApplyEntityFieldFiltersAction(
        core.getStartServices
      );
      return applyEntityFieldFilterAction;
    }
  );
  uiActions.addTriggerActionAsync(
    SINGLE_METRIC_VIEWER_ENTITY_FIELD_SELECTION_TRIGGER,
    'ACTION_SINGLE_METRIC_VIEWER_ENTITY_FIELD_SELECTION',
    async () => {
      const { createApplyEntityFieldFiltersAction } = await import('./apply_entity_filters_action');
      const smvApplyEntityFieldFilterAction = createApplyEntityFieldFiltersAction(
        core.getStartServices,
        CONTROLLED_BY_SINGLE_METRIC_VIEWER_FILTER
      );
      return smvApplyEntityFieldFilterAction;
    }
  );
  uiActions.addTriggerActionAsync(
    CONTEXT_MENU_TRIGGER,
    'CREATE_LENS_VIS_TO_ML_AD_JOB_ACTION',
    async () => {
      const { createVisToADJobAction } = await import('./open_vis_in_ml_action');
      const visToAdJobAction = createVisToADJobAction(core.getStartServices);
      return visToAdJobAction;
    }
  );
  uiActions.addTriggerActionAsync(
    CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_TRIGGER,
    'CATEGORIZATION_AD_JOB_ACTION',
    async () => {
      const { createCategorizationADJobAction } = await import(
        './open_create_categorization_job_action'
      );
      const categorizationADJobAction = createCategorizationADJobAction(core.getStartServices);
      return categorizationADJobAction;
    }
  );
}
