/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const revealImage = () => ({
  name: 'revealImage',
  displayName: 'Reveal image',
  help: '',
  modelArgs: [['_', { label: 'Value' }]],
  args: [
    {
      name: 'image',
      displayName: 'Image',
      help: 'An image to reveal given the function input. Eg, a full glass',
      argType: 'imageUpload',
    },
    {
      name: 'emptyImage',
      displayName: 'Background image',
      help: 'A background image. Eg, an empty glass',
      argType: 'imageUpload',
    },
    {
      name: 'origin',
      displayName: 'Reveal from',
      help: 'The direction from which to start the reveal',
      argType: 'select',
      options: {
        choices: [
          { value: 'top', name: 'Top' },
          { value: 'left', name: 'Left' },
          { value: 'bottom', name: 'Bottom' },
          { value: 'right', name: 'Right' },
        ],
      },
    },
  ],
});
