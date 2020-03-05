/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { FormatFactory } from '../legacy_imports';
import { metricVisualization } from './metric_visualization';
import { ExpressionsSetup } from '../../../../../../src/plugins/expressions/public';
import { metricChart, getMetricChartRenderer } from './metric_expression';
import { EditorFrameSetup } from '../types';

export interface MetricVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: FormatFactory;
  editorFrame: EditorFrameSetup;
}

export class MetricVisualization {
  constructor() {}

  setup(
    _core: CoreSetup | null,
    { expressions, formatFactory, editorFrame }: MetricVisualizationPluginSetupPlugins
  ) {
    expressions.registerFunction(() => metricChart);

    expressions.registerRenderer(() => getMetricChartRenderer(formatFactory));

    editorFrame.registerVisualization(metricVisualization);
  }
}
