/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../common/lib/fonts';
import { AdvancedSettings } from '../../../public/lib/kibana_advanced_settings';
import { ViewStrings } from '../../strings';

export const metric = () => ({
  name: 'metric',
  displayName: ViewStrings.Metric.getDisplayName(),
  modelArgs: [['_', { label: 'Number' }]],
  requiresContext: false,
  args: [
    {
      name: '_',
      displayName: ViewStrings.Metric.args.label.getDisplayName(),
      help: ViewStrings.Metric.args.label.getHelp(),
      argType: 'string',
      default: '""',
    },
    {
      name: 'labelFont',
      displayName: ViewStrings.Metric.args.labelFont.getDisplayName(),
      help: ViewStrings.Metric.args.labelFont.getHelp(),
      argType: 'font',
      default: `{font size=18 family="${openSans.value}" color="#000000" align=center}`,
    },
    {
      name: 'metricFont',
      displayName: ViewStrings.Metric.args.metricFont.getDisplayName(),
      help: ViewStrings.Metric.args.metricFont.getHelp(),
      argType: 'font',
      default: `{font size=48 family="${openSans.value}" color="#000000" align=center lHeight=48}`,
    },
    {
      name: 'metricFormat',
      displayName: ViewStrings.Metric.args.metricFormat.getDisplayName(),
      argType: 'numberFormat',
      default: `"${AdvancedSettings.get('format:number:defaultPattern')}"`,
    },
  ],
});
