/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shapes } from '../../renderers/shape/shapes';

export const shape = () => ({
  name: 'shape',
  displayName: 'Shape',
  modelArgs: [],
  requiresContext: false,
  args: [
    {
      name: '_',
      displayName: 'Select a shape',
      argType: 'shape',
      options: {
        shapes,
      },
    },
    {
      name: 'fill',
      displayName: 'Fill',
      argType: 'color',
      help: 'Accepts HEX, RGB or HTML Color names',
    },
    {
      name: 'border',
      displayName: 'Border',
      argType: 'color',
      help: 'Accepts HEX, RGB or HTML Color names',
    },
    {
      name: 'borderWidth',
      displayName: 'Border width',
      argType: 'number',
      help: 'Border width',
    },
    {
      name: 'maintainAspect',
      displayName: 'Maintain aspect ratio',
      argType: 'toggle',
      help: `Select 'true' to maintain aspect ratio`,
    },
  ],
});
