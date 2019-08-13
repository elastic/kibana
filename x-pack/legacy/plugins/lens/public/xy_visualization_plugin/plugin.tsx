/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { getFormat, FormatFactory } from 'ui/visualize/loader/pipeline_helpers/utilities';
import { xyVisualization } from './xy_visualization';

import {
  renderersRegistry,
  functionsRegistry,
} from '../../../../../../src/legacy/core_plugins/interpreter/public/registries';
import { InterpreterSetup, RenderFunction } from '../interpreter_types';
import { xyChart, getXyChartRenderer } from './xy_expression';
import { legendConfig, xConfig, layerConfig } from './types';

export interface XyVisualizationPluginSetupPlugins {
  interpreter: InterpreterSetup;
  // TODO this is a simulated NP plugin.
  // Once field formatters are actually migrated, the actual shim can be used
  fieldFormat: {
    formatFactory: FormatFactory;
  };
}

class XyVisualizationPlugin {
  constructor() {}

  setup(_core: CoreSetup | null, { interpreter, fieldFormat }: XyVisualizationPluginSetupPlugins) {
    interpreter.functionsRegistry.register(() => legendConfig);
    interpreter.functionsRegistry.register(() => xConfig);
    interpreter.functionsRegistry.register(() => layerConfig);
    interpreter.functionsRegistry.register(() => xyChart);

    interpreter.renderersRegistry.register(
      () => getXyChartRenderer(fieldFormat.formatFactory) as RenderFunction<unknown>
    );

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
    fieldFormat: {
      formatFactory: getFormat,
    },
  });
export const xyVisualizationStop = () => plugin.stop();
