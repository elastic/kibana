/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { FormatFactory, getFormat } from 'ui/visualize/loader/pipeline_helpers/utilities';
import { metricVisualization } from './metric_visualization';
import { ExpressionsSetup } from '../../../../../../src/legacy/core_plugins/expressions/public';
import { setup as expressionsSetup } from '../../../../../../src/legacy/core_plugins/expressions/public/legacy';
import { metricChart, getMetricChartRenderer } from './metric_expression';

export interface MetricVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  // TODO this is a simulated NP plugin.
  // Once field formatters are actually migrated, the actual shim can be used
  fieldFormat: {
    formatFactory: FormatFactory;
  };
}

class MetricVisualizationPlugin {
  constructor() {}

  setup(
    _core: CoreSetup | null,
    { expressions, fieldFormat }: MetricVisualizationPluginSetupPlugins
  ) {
    expressions.registerFunction(() => metricChart);

    expressions.registerRenderer(() => getMetricChartRenderer(fieldFormat.formatFactory));

    return metricVisualization;
  }

  stop() {}
}

const plugin = new MetricVisualizationPlugin();

export const metricVisualizationSetup = () =>
  plugin.setup(null, {
    expressions: expressionsSetup,
    fieldFormat: {
      formatFactory: getFormat,
    },
  });

export const metricVisualizationStop = () => plugin.stop();
