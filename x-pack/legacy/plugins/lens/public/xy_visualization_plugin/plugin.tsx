/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { xyVisualization } from './xy_visualization';

import {
  renderersRegistry,
  functionsRegistry,
} from '../../../../../../src/legacy/core_plugins/interpreter/public/registries';
import { InterpreterSetup, RenderFunction } from '../interpreter_types';
import { xyChart, xyChartRenderer } from './xy_expression';
import { legendConfig, xConfig, yConfig } from './types';

export interface XyVisualizationPluginSetupPlugins {
  interpreter: InterpreterSetup;
}

class XyVisualizationPlugin {
  constructor() {}

  setup(_core: CoreSetup | null, { interpreter }: XyVisualizationPluginSetupPlugins) {
    interpreter.functionsRegistry.register(() => legendConfig);
    interpreter.functionsRegistry.register(() => xConfig);
    interpreter.functionsRegistry.register(() => yConfig);
    interpreter.functionsRegistry.register(() => xyChart);

    interpreter.renderersRegistry.register(() => xyChartRenderer as RenderFunction<unknown>);

    return xyVisualization;
  }

  stop() {}
}

const plugin = new XyVisualizationPlugin();

export const xyVisualizationSetup = () =>
  plugin.setup(null, {
    interpreter: {
      renderersRegistry,
      functionsRegistry,
    },
  });
export const xyVisualizationStop = () => plugin.stop();
