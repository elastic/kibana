/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart } from '../../../../src/core/public';
import { UiActionsSetup, UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';

export interface SetupDependencies {
  data: DataPublicPluginSetup;
  uiActions: UiActionsSetup;
}

export interface StartDependencies {
  data: DataPublicPluginStart;
  uiActions: UiActionsStart;
}

export class UiActionsEnhancedExamplesPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies> {
  public setup(core: CoreSetup<StartDependencies>, { uiActions, drilldowns }: SetupDependencies) {
    // eslint-disable-next-line
    console.log('ui_actions_enhanced_examples');
  }

  public start(core: CoreStart, plugins: StartDependencies) {}

  public stop() {}
}
