/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ViewStrings } from '../../strings';

export const revealImage = () => ({
  name: 'revealImage',
  displayName: ViewStrings.RevealImage.getDisplayName(),
  help: ViewStrings.RevealImage.getHelp(),
  modelArgs: [['_', { label: 'Value' }]],
  args: [
    {
      name: 'image',
      displayName: ViewStrings.RevealImage.args.Image.getDisplayName(),
      help: ViewStrings.RevealImage.args.Image.getHelp(),
      argType: 'imageUpload',
    },
    {
      name: 'emptyImage',
      displayName: ViewStrings.RevealImage.args.EmptyImage.getDisplayName(),
      help: ViewStrings.RevealImage.args.EmptyImage.getHelp(),
      argType: 'imageUpload',
    },
    {
      name: 'origin',
      displayName: ViewStrings.RevealImage.args.Origin.getDisplayName(),
      help: ViewStrings.RevealImage.args.Origin.getHelp(),
      argType: 'select',
      options: {
        choices: [
          { value: 'top', name: ViewStrings.RevealImage.args.Origin.getOptionTop() },
          { value: 'left', name: ViewStrings.RevealImage.args.Origin.getOptionLeft() },
          { value: 'bottom', name: ViewStrings.RevealImage.args.Origin.getOptionBottom() },
          { value: 'right', name: ViewStrings.RevealImage.args.Origin.getOptionRight() },
        ],
      },
    },
  ],
});
