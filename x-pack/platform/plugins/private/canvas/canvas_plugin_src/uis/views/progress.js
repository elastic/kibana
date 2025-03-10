/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAvailableProgressShapes } from '@kbn/expression-shape-plugin/common';
import { openSans } from '../../../common/lib/fonts';
import { ViewStrings } from '../../../i18n';

const { Progress: strings } = ViewStrings;

export const progress = () => ({
  name: 'progress',
  displayName: strings.getDisplayName(),
  modelArgs: [['_', { label: 'Value' }]],
  requiresContext: false,
  args: [
    {
      name: 'shape',
      displayName: strings.getShapeDisplayName(),
      help: strings.getShapeHelp(),
      argType: 'select',
      options: {
        choices: getAvailableProgressShapes().map((key) => ({
          value: key,
          //turns camel into title case
          name: key[0].toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        })),
      },
    },
    {
      name: 'max',
      displayName: strings.getMaxDisplayName(),
      help: strings.getMaxHelp(),
      argType: 'number',
      default: '1',
    },
    {
      name: 'valueColor',
      displayName: strings.getValueColorDisplayName(),
      help: strings.getValueColorHelp(),
      argType: 'color',
      default: `#1785b0`,
    },
    {
      name: 'valueWeight',
      displayName: strings.getValueWeightDisplayName(),
      help: strings.getValueWeightHelp(),
      argType: 'number',
      default: '20',
    },
    {
      name: 'barColor',
      displayName: strings.getBarColorDisplayName(),
      help: strings.getBarColorHelp(),
      argType: 'color',
      default: `#f0f0f0`,
    },
    {
      name: 'barWeight',
      displayName: strings.getBarWeightDisplayName(),
      help: strings.getBarWeightHelp(),
      argType: 'number',
      default: '20',
    },
    {
      name: 'label',
      displayName: strings.getLabelDisplayName(),
      help: strings.getLabelHelp(),
      argType: 'toggle',
      default: 'true',
    },
    {
      name: 'font',
      displayName: strings.getFontDisplayName(),
      help: strings.getFontHelp(),
      argType: 'font',
      default: `{font size=24 family="${openSans.value}" color="#000000" align=center}`,
    },
  ],
});
