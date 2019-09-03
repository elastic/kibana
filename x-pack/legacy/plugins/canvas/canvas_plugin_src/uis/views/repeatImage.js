/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const repeatImage = () => ({
  name: 'repeatImage',
  displayName: 'Repeating image',
  help: '',
  modelArgs: [['_', { label: 'Value' }]],
  args: [
    {
      name: 'image',
      displayName: 'Image',
      help: 'An image to repeat',
      argType: 'imageUpload',
    },
    {
      name: 'emptyImage',
      displayName: 'Empty image',
      help: 'An image to fill up the difference between the value and the max count',
      argType: 'imageUpload',
    },
    {
      name: 'size',
      displayName: 'Image size',
      help:
        'The size of the largest dimension of the image. Eg, if the image is tall but not wide, this is the height',
      argType: 'number',
      default: '100',
    },
    {
      name: 'max',
      displayName: 'Max count',
      help: 'The maximum number of repeated images',
      argType: 'number',
      default: '1000',
    },
  ],
});
