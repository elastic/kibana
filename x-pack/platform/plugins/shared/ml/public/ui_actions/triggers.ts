/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Trigger } from '@kbn/ui-actions-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { AppStateSelectedCells } from '../application/explorer/explorer_utils';
import type { AnomalySwimLaneEmbeddableApi } from '../embeddables/anomaly_swimlane/types';
import { isSwimLaneEmbeddableContext } from '../embeddables/anomaly_swimlane/types';

export const SWIM_LANE_SELECTION_TRIGGER = 'SWIM_LANE_SELECTION_TRIGGER';

export const swimLaneSelectionTrigger: Trigger = {
  id: SWIM_LANE_SELECTION_TRIGGER,
  // This is empty string to hide title of ui_actions context menu that appears
  // when this trigger is executed.
  title: '',
  description: 'Swim lane selection triggered',
};

export const EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER = 'EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER';
export const entityFieldSelectionTrigger: Trigger = {
  id: EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER,
  // This is empty string to hide title of ui_actions context menu that appears
  // when this trigger is executed.
  title: '',
  description: 'Entity field selection triggered',
};

export const SINGLE_METRIC_VIEWER_ENTITY_FIELD_SELECTION_TRIGGER =
  'SINGLE_METRIC_VIEWER_ENTITY_FIELD_SELECTION_TRIGGER';
export const smvEntityFieldSelectionTrigger: Trigger = {
  id: SINGLE_METRIC_VIEWER_ENTITY_FIELD_SELECTION_TRIGGER,
  // This is empty string to hide title of ui_actions context menu that appears
  // when this trigger is executed.
  title: '',
  description: 'Single metric viewer entity field selection triggered',
};

export interface AnomalySwimLaneSelectionTriggerContext extends EmbeddableApiContext {
  embeddable: AnomalySwimLaneEmbeddableApi;
  /**
   * Data provided by swim lane selection
   */
  data: AppStateSelectedCells;
}

export const isAnomalySwimlaneSelectionTriggerContext = (
  context: unknown
): context is AnomalySwimLaneSelectionTriggerContext => {
  return isSwimLaneEmbeddableContext(context) && context.data !== undefined;
};
