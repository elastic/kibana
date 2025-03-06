/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublishingSubject } from '@kbn/presentation-publishing';
import { UiActionsEnhancedDynamicActionManager as DynamicActionManager } from '@kbn/ui-actions-enhanced-plugin/public';
import { DynamicActionsSerializedState } from '../../plugin';

export type HasDynamicActions = Partial<{
  enhancements: { dynamicActions: DynamicActionManager };
  setDynamicActions: (newState: DynamicActionsSerializedState['enhancements']) => void;
  dynamicActionsState$: PublishingSubject<DynamicActionsSerializedState['enhancements']>;
}>;

export const apiHasDynamicActions = (api: unknown): api is Required<HasDynamicActions> => {
  const apiMaybeHasDynamicActions = api as Required<HasDynamicActions>;
  return Boolean(
    apiMaybeHasDynamicActions &&
      apiMaybeHasDynamicActions.enhancements &&
      typeof apiMaybeHasDynamicActions.enhancements.dynamicActions === 'object' &&
      typeof apiMaybeHasDynamicActions.setDynamicActions === 'function' &&
      apiMaybeHasDynamicActions.dynamicActionsState$
  );
};
