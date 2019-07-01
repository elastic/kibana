/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Registry } from '@kbn/interpreter/target/common';
import { CoreSetup } from 'src/core/public';
import { metricVisualization } from './metric_visualization';
import {
  renderersRegistry,
  functionsRegistry,
  // @ts-ignore untyped dependency
} from '../../../../../../src/legacy/core_plugins/interpreter/public/registries';
import { ExpressionFunction } from '../../../../../../src/legacy/core_plugins/interpreter/public';
import { metricChart, metricChartRenderer } from './metric_expression';

// TODO these are intermediary types because interpreter is not typed yet
// They can get replaced by references to the real interfaces as soon as they
// are available
interface RenderHandlers {
  done: () => void;
  onDestroy: (fn: () => void) => void;
}

export interface RenderFunction<T = unknown> {
  name: string;
  displayName: string;
  help: string;
  validate: () => void;
  reuseDomNode: boolean;
  render: (domNode: Element, data: T, handlers: RenderHandlers) => void;
}

export interface InterpreterSetup {
  renderersRegistry: Registry<RenderFunction, RenderFunction>;
  functionsRegistry: Registry<
    ExpressionFunction<string, unknown, unknown, unknown>,
    ExpressionFunction<string, unknown, unknown, unknown>
  >;
}

export interface MetricVisualizationPluginSetupPlugins {
  interpreter: InterpreterSetup;
}

class MetricVisualizationPlugin {
  constructor() {}

  setup(_core: CoreSetup | null, { interpreter }: MetricVisualizationPluginSetupPlugins) {
    interpreter.functionsRegistry.register(() => metricChart);

    interpreter.renderersRegistry.register(() => metricChartRenderer as RenderFunction<unknown>);

    return metricVisualization;
  }

  stop() {}
}

const plugin = new MetricVisualizationPlugin();

export const metricVisualizationSetup = () =>
  plugin.setup(null, {
    interpreter: {
      renderersRegistry,
      functionsRegistry,
    },
  });

export const metricVisualizationStop = () => plugin.stop();
