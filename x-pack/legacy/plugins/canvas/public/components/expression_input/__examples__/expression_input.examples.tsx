/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ExpressionInput } from '../expression_input';

const sampleFunctionDef = {
  name: 'markdown',
  type: 'render',
  aliases: [],
  help:
    'Adds an element that renders Markdown text. TIP: Use the `markdown` function for single numbers, metrics, and paragraphs of text.',
  args: {
    content: {
      name: 'content',
      required: false,
      help:
        'A string of text that contains Markdown. To concatenate, pass the `string` function multiple times.',
      types: ['string'],
      default: '""',
      aliases: ['_', 'expression'],
      multi: true,
      resolve: false,
      options: [],
    },
    font: {
      name: 'font',
      required: false,
      help: 'The CSS font properties for the content. For example, font-family or font-weight.',
      types: ['style'],
      default: '{font}',
      aliases: [],
      multi: false,
      resolve: true,
      options: [],
    },
  },
  context: {
    types: ['datatable', 'null'],
  },

  fn: () => {
    return true;
  },
};

storiesOf('components/ExpressionInput', module).add('default', () => (
  <ExpressionInput
    fontSize={16}
    value="markdown"
    onChange={action('onChange')}
    functionDefinitions={[sampleFunctionDef as any]}
  />
));
