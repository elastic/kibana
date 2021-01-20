/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, Plugin } from 'kibana/public';
import { VisualizationsSetup } from '../../../../../src/plugins/visualizations/public';
import { SelfChangingEditor } from './self_changing_vis/self_changing_editor';
import { SelfChangingComponent } from './self_changing_vis/self_changing_components';

export interface SetupDependencies {
  visualizations: VisualizationsSetup;
}

export class CustomVisualizationsPublicPlugin
  implements Plugin<CustomVisualizationsSetup, CustomVisualizationsStart> {
  public setup(core: CoreSetup, setupDeps: SetupDependencies) {
    setupDeps.visualizations.createReactVisualization({
      name: 'self_changing_vis',
      title: 'Self Changing Vis',
      icon: 'controlsHorizontal',
      description:
        'This visualization is able to change its own settings, that you could also set in the editor.',
      visConfig: {
        component: SelfChangingComponent,
        defaults: {
          counter: 0,
        },
      },
      editorConfig: {
        optionTabs: [
          {
            name: 'options',
            title: 'Options',
            editor: SelfChangingEditor,
          },
        ],
      },
      requestHandler: 'none',
    });
  }

  public start() {}
  public stop() {}
}

export type CustomVisualizationsSetup = ReturnType<CustomVisualizationsPublicPlugin['setup']>;
export type CustomVisualizationsStart = ReturnType<CustomVisualizationsPublicPlugin['start']>;
