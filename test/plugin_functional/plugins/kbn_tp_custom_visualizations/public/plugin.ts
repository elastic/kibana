/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin } from '@kbn/core/public';
import { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import { Plugin as ExpressionsPlugin } from '@kbn/expressions-plugin/public';

import { SelfChangingEditor } from './self_changing_vis/self_changing_editor';
import { selfChangingVisFn, SelfChangingVisParams } from './self_changing_vis_fn';
import { selfChangingVisRenderer } from './self_changing_vis_renderer';
import { toExpressionAst } from './to_ast';

export interface SetupDependencies {
  expressions: ReturnType<ExpressionsPlugin['setup']>;
  visualizations: VisualizationsSetup;
}

export class CustomVisualizationsPublicPlugin
  implements Plugin<CustomVisualizationsSetup, CustomVisualizationsStart>
{
  public setup(core: CoreSetup, { expressions, visualizations }: SetupDependencies) {
    /**
     * Register an expression function with type "render" for your visualization
     */
    expressions.registerFunction(selfChangingVisFn);

    /**
     * Register a renderer for your visualization
     */
    expressions.registerRenderer(selfChangingVisRenderer);

    /**
     * Create the visualization type with definition
     */
    visualizations.createBaseVisualization<SelfChangingVisParams>({
      name: 'self_changing_vis',
      title: 'Self Changing Vis',
      icon: 'controlsHorizontal',
      description:
        'This visualization is able to change its own settings, that you could also set in the editor.',
      visConfig: {
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
      toExpressionAst,
    });
  }

  public start() {}
  public stop() {}
}

export type CustomVisualizationsSetup = ReturnType<CustomVisualizationsPublicPlugin['setup']>;
export type CustomVisualizationsStart = ReturnType<CustomVisualizationsPublicPlugin['start']>;
