/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { CoreSetup, Plugin } from 'kibana/public';
import { VisualizationsSetup } from 'src/plugins/visualizations/public';
import { Plugin as ExpressionsPlugin } from '../../../../../src/plugins/expressions/public';

import { SelfChangingEditor } from './self_changing_vis/self_changing_editor';
import { selfChangingVisFn, SelfChangingVisParams } from './self_changing_vis_fn';
import { selfChangingVisRenderer } from './self_changing_vis_renderer';
import { toExpressionAst } from './to_ast';

export interface SetupDependencies {
  expressions: ReturnType<ExpressionsPlugin['setup']>;
  visualizations: VisualizationsSetup;
}

export class CustomVisualizationsPublicPlugin
  implements Plugin<CustomVisualizationsSetup, CustomVisualizationsStart> {
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
