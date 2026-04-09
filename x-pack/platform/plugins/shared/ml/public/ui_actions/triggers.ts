/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { AppStateSelectedCells } from '../application/explorer/explorer_utils';
import type { AnomalySwimLaneEmbeddableApi } from '../embeddables/anomaly_swimlane/types';
import { isSwimLaneEmbeddableContext } from '../embeddables/anomaly_swimlane/types';

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
