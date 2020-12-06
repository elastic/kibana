/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext, useContext } from 'react';
import { CoreStart } from 'src/core/public';
import { UiActionsEnhancedDynamicActionManager } from '../../../../plugins/ui_actions_enhanced/public';
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
