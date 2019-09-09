/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ViewStrings } from '../../strings';

export const repeatImage = () => ({
  name: 'repeatImage',
  displayName: ViewStrings.RepeatImage.getDisplayName(),
  help: ViewStrings.RepeatImage.getHelp(),
  modelArgs: [['_', { label: 'Value' }]],
  args: [
    {
      name: 'image',
      displayName: ViewStrings.RepeatImage.args.Image.getDisplayName(),
      help: ViewStrings.RepeatImage.args.Image.getHelp(),
      argType: 'imageUpload',
    },
    {
      name: 'emptyImage',
      displayName: ViewStrings.RepeatImage.args.EmptyImage.getDisplayName(),
      help: ViewStrings.RepeatImage.args.EmptyImage.getHelp(),
      argType: 'imageUpload',
    },
    {
      name: 'size',
      displayName: ViewStrings.RepeatImage.args.Size.getDisplayName(),
      help: ViewStrings.RepeatImage.args.Size.getHelp(),
      argType: 'number',
      default: '100',
    },
    {
      name: 'max',
      displayName: ViewStrings.RepeatImage.args.Max.getDisplayName(),
      help: ViewStrings.RepeatImage.args.Max.getHelp(),
      argType: 'number',
      default: '1000',
    },
  ],
});
