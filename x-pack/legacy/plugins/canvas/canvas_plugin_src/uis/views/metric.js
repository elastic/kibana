/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../common/lib/fonts';
import { AdvancedSettings } from '../../../public/lib/kibana_advanced_settings';
import { ViewStrings } from '../../strings';

const { Metric: strings } = ViewStrings;

export const metric = () => ({
  name: 'metric',
  displayName: strings.getDisplayName(),
  modelArgs: [['_', { label: 'Number' }]],
  requiresContext: false,
  args: [
    {
      name: '_',
      displayName: strings.getLabelDisplayName(),
      help: strings.getLabelHelp(),
      argType: 'string',
      default: '""',
    },
    {
      name: 'labelFont',
      displayName: strings.getLabelFontDisplayName(),
      help: strings.getLabelFontHelp(),
      argType: 'font',
      default: `{font size=18 family="${openSans.value}" color="#000000" align=center}`,
    },
    {
      name: 'metricFont',
      displayName: strings.getMetricFontDisplayName(),
      help: strings.getMetricFontHelp(),
      argType: 'font',
      default: `{font size=48 family="${openSans.value}" color="#000000" align=center lHeight=48}`,
    },
    {
      name: 'metricFormat',
      displayName: strings.getMetricFormatDisplayName(),
      help: strings.getMetricFormatHelp(),
      argType: 'numberFormat',
      default: `"${AdvancedSettings.get('format:number:defaultPattern')}"`,
    },
  ],
});
