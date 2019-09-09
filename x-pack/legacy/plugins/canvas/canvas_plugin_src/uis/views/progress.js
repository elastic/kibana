/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../common/lib/fonts';
import { shapes } from '../../renderers/progress/shapes';
import { ViewStrings } from '../../strings';

export const progress = () => ({
  name: 'progress',
  displayName: ViewStrings.Progress.getDisplayName(),
  modelArgs: [['_', { label: 'Value' }]],
  requiresContext: false,
  args: [
    {
      name: 'shape',
      displayName: ViewStrings.Progress.args.Shape.getDisplayName(),
      help: ViewStrings.Progress.args.Shape.getHelp(),
      argType: 'select',
      options: {
        choices: Object.keys(shapes).map(key => ({
          value: key,
          //turns camel into title case
          name: key[0].toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        })),
      },
    },
    {
      name: 'max',
      displayName: ViewStrings.Progress.args.Max.getDisplayName(),
      help: ViewStrings.Progress.args.Max.getHelp(),
      argType: 'number',
      default: '1',
    },
    {
      name: 'valueColor',
      displayName: ViewStrings.Progress.args.ValueColor.getDisplayName(),
      help: ViewStrings.Progress.args.ValueColor.getHelp(),
      argType: 'color',
      default: `#1785b0`,
    },
    {
      name: 'valueWeight',
      displayName: ViewStrings.Progress.args.ValueWeight.getDisplayName(),
      help: ViewStrings.Progress.args.ValueWeight.getHelp(),
      argType: 'number',
      default: '20',
    },
    {
      name: 'barColor',
      displayName: ViewStrings.Progress.args.BarColor.getDisplayName(),
      help: ViewStrings.Progress.args.BarColor.getHelp(),
      argType: 'color',
      default: `#f0f0f0`,
    },
    {
      name: 'barWeight',
      displayName: ViewStrings.Progress.args.BarWeight.getDisplayName(),
      help: ViewStrings.Progress.args.BarWeight.getHelp(),
      argType: 'number',
      default: '20',
    },
    {
      name: 'label',
      displayName: ViewStrings.Progress.args.Label.getDisplayName(),
      help: ViewStrings.Progress.args.Label.getHelp(),
      argType: 'toggle',
      default: 'true',
    },
    {
      name: 'font',
      displayName: ViewStrings.Progress.args.Font.getDisplayName(),
      help: ViewStrings.Progress.args.Font.getHelp(),
      argType: 'font',
      default: `{font size=24 family="${openSans.value}" color="#000000" align=center}`,
    },
  ],
});
