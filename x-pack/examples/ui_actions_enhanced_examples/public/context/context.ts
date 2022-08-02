/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import { CoreStart } from '@kbn/core/public';
import { UiActionsEnhancedDynamicActionManager } from '@kbn/ui-actions-enhanced-plugin/public';
import { StartDependencies } from '../plugin';

export interface UiActionsExampleAppContextValue {
  appBasePath: string;
  core: CoreStart;
  plugins: StartDependencies;
  managerWithoutEmbeddable: UiActionsEnhancedDynamicActionManager;
  managerWithoutEmbeddableSingleButton: UiActionsEnhancedDynamicActionManager;
  managerWithEmbeddable: UiActionsEnhancedDynamicActionManager;
}

export const context = createContext<UiActionsExampleAppContextValue | null>(null);
export const useUiActions = () => useContext(context)!;
