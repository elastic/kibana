/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { elasticLogo } from '../../../lib';
import { ElementCard } from '../element_card';

export default {
  title: 'components/Elements/ElementCard',

  decorators: [
    (story) => (
      <div
        style={{
          width: '210px',
        }}
      >
        {story()}
      </div>
    ),
  ],
} as Meta;

export const WithTitleAndDescription: StoryObj = {
  render: () => (
    <ElementCard
      title="Element 1"
      description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce lobortis aliquet arcu ut turpis duis."
    />
  ),

  name: 'with title and description',
};

export const WithImage: StoryObj = {
  render: (_, props) => (
    <ElementCard
      title="Element 1"
      description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce lobortis aliquet arcu ut turpis duis."
      image={elasticLogo}
    />
  ),

  name: 'with image',
};

export const WithTags: StoryObj = {
  render: () => (
    <ElementCard
      title="Element 1"
      description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce lobortis aliquet arcu ut turpis duis."
      tags={['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6']}
      onClick={action('onClick')}
    />
  ),

  name: 'with tags',
};

export const WithClickHandler: StoryObj = {
  render: () => (
    <ElementCard
      title="Element 1"
      description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce lobortis aliquet arcu ut turpis duis."
      onClick={action('onClick')}
    />
  ),

  name: 'with click handler',
};
