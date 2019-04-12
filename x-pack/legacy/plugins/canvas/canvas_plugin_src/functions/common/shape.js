/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const shape = () => ({
  name: 'shape',
  aliases: [],
  type: 'shape',
  help: 'Create a shape',
  context: {
    types: ['null'],
  },
  args: {
    shape: {
      types: ['string', 'null'],
      help: 'Pick a shape',
      aliases: ['_'],
      default: 'square',
      options: [
        'arrow',
        'arrowMulti',
        'bookmark',
        'cross',
        'circle',
        'hexagon',
        'kite',
        'pentagon',
        'rhombus',
        'semicircle',
        'speechBubble',
        'square',
        'star',
        'tag',
        'triangle',
        'triangleRight',
      ],
    },
    fill: {
      types: ['string', 'null'],
      help: 'Valid CSS color string',
      default: 'black',
    },
    border: {
      types: ['string', 'null'],
      aliases: ['stroke'],
      help: 'Valid CSS color string',
    },
    borderWidth: {
      types: ['number', 'null'],
      aliases: ['strokeWidth'],
      help: 'Thickness of the border',
      default: '0',
    },
    maintainAspect: {
      types: ['boolean'],
      help: 'Select true to maintain aspect ratio',
      default: false,
      options: [true, false],
    },
  },
  fn: (context, { shape, fill, border, borderWidth, maintainAspect }) => ({
    type: 'shape',
    shape,
    fill,
    border,
    borderWidth,
    maintainAspect,
  }),
});
