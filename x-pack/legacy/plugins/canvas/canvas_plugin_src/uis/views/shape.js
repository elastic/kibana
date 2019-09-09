/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shapes } from '../../renderers/shape/shapes';
import { ViewStrings } from '../../strings';

export const shape = () => ({
  name: 'shape',
  displayName: ViewStrings.Shape.getDisplayName(),
  modelArgs: [],
  requiresContext: false,
  args: [
    {
      name: '_',
      displayName: ViewStrings.Shape.args.Shape.getDisplayName(),
      argType: 'shape',
      options: {
        shapes,
      },
    },
    {
      name: 'fill',
      displayName: ViewStrings.Shape.args.Fill.getDisplayName(),
      argType: 'color',
      help: ViewStrings.Shape.args.Fill.getHelp(),
    },
    {
      name: 'border',
      displayName: ViewStrings.Shape.args.Border.getDisplayName(),
      argType: 'color',
      help: ViewStrings.Shape.args.Border.getHelp(),
    },
    {
      name: 'borderWidth',
      displayName: ViewStrings.Shape.args.BorderWidth.getDisplayName(),
      argType: 'number',
      help: ViewStrings.Shape.args.BorderWidth.getHelp(),
    },
    {
      name: 'maintainAspect',
      displayName: ViewStrings.Shape.args.MaintainAspect.getDisplayName(),
      argType: 'toggle',
      help: ViewStrings.Shape.args.MaintainAspect.getHelp(),
    },
  ],
});
