/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateComparators } from '@kbn/presentation-publishing';
import type { DynamicActionsState } from '@kbn/ui-actions-enhanced-plugin/public';
import type { Observable } from 'rxjs';
import type { DrilldownsState } from '@kbn/embeddable-plugin/server';
import type { HasDynamicActions } from './interfaces/has_dynamic_actions';

export interface EmbeddableDynamicActionsManager {
  api: HasDynamicActions;
  comparators: StateComparators<DynamicActionsSerializedState>;
  anyStateChange$: Observable<void>;
  getLatestState: () => DynamicActionsSerializedState;
  serializeState: () => DynamicActionsSerializedState;
  reinitializeState: (lastState: DynamicActionsSerializedState) => void;
  startDynamicActions: () => { stopDynamicActions: () => void };
}

export type DynamicActionsSerializedState = DrilldownsState & {
  enhancements?: { dynamicActions: DynamicActionsState };
};
