/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup } from 'ui/new_platform';
import { CoreSetup, IUiSettingsClient } from 'src/core/public';
import chrome, { Chrome } from 'ui/chrome';
import moment from 'moment-timezone';
import { getFormat, FormatFactory } from 'ui/visualize/loader/pipeline_helpers/utilities';
import { ExpressionsSetup } from '../../../../../../src/plugins/expressions/public';
import { xyVisualization } from './xy_visualization';
import { xyChart, getXyChartRenderer } from './xy_expression';
import { legendConfig, xConfig, layerConfig } from './types';

export interface XyVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  chrome: Chrome;
  // TODO this is a simulated NP plugin.
  // Once field formatters are actually migrated, the actual shim can be used
  fieldFormat: {
    formatFactory: FormatFactory;
  };
}

function getTimeZone(uiSettings: IUiSettingsClient) {
  const configuredTimeZone = uiSettings.get('dateFormat:tz');
  if (configuredTimeZone === 'Browser') {
    return moment.tz.guess();
  }

  return configuredTimeZone;
}

class XyVisualizationPlugin {
  constructor() {}

  setup(
    _core: CoreSetup | null,
    {
      expressions,
      fieldFormat: { formatFactory },
      chrome: { getUiSettingsClient },
    }: XyVisualizationPluginSetupPlugins
  ) {
    expressions.registerFunction(() => legendConfig);
    expressions.registerFunction(() => xConfig);
    expressions.registerFunction(() => layerConfig);
    expressions.registerFunction(() => xyChart);

    expressions.registerRenderer(() =>
      getXyChartRenderer({
        formatFactory,
        timeZone: getTimeZone(getUiSettingsClient()),
      })
    );

    return xyVisualization;
  }

  stop() {}
}

const plugin = new XyVisualizationPlugin();

export const xyVisualizationSetup = () =>
  plugin.setup(null, {
    expressions: npSetup.plugins.expressions,
    fieldFormat: {
      formatFactory: getFormat,
    },
    chrome,
  });
export const xyVisualizationStop = () => plugin.stop();
