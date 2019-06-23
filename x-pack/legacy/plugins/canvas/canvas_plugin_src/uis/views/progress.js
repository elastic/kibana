/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../common/lib/fonts';
import { shapes } from '../../renderers/progress/shapes';

export const progress = () => ({
  name: 'progress',
  displayName: 'Progress',
  modelArgs: [['_', { label: 'Value' }]],
  requiresContext: false,
  args: [
    {
      name: 'shape',
      displayName: 'Shape',
      help: 'Shape of the progress indicator',
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
      displayName: 'Maximum value',
      help: 'Maximum value of the progress element',
      argType: 'number',
      default: '1',
    },
    {
      name: 'valueColor',
      displayName: 'Progress color',
      help: 'Accepts HEX, RGB or HTML Color names',
      argType: 'color',
      default: `#1785b0`,
    },
    {
      name: 'valueWeight',
      displayName: 'Progress weight',
      help: 'Thickness of the progress bar',
      argType: 'number',
      default: '20',
    },
    {
      name: 'barColor',
      displayName: 'Background color',
      help: 'Accepts HEX, RGB or HTML Color names',
      argType: 'color',
      default: `#f0f0f0`,
    },
    {
      name: 'barWeight',
      displayName: 'Background weight',
      help: 'Thickness of the background bar',
      argType: 'number',
      default: '20',
    },
    {
      name: 'label',
      displayName: 'Label',
      help: `Set true/false to show/hide label or provide a string to display as the label`,
      argType: 'toggle',
      default: 'true',
    },
    {
      name: 'font',
      displayName: 'Label settings',
      help: 'Font settings for the label. Technically, you can add other styles as well',
      argType: 'font',
      default: `{font size=24 family="${openSans.value}" color="#000000" align=center}`,
    },
  ],
});
