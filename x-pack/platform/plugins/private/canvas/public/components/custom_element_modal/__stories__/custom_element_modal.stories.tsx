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
import { CustomElementModal } from '../custom_element_modal';

export default {
  title: 'components/Elements/CustomElementModal',
} as Meta;

export const WithTitle: StoryObj = {
  render: () => (
    <CustomElementModal
      title="Create new element"
      onCancel={action('onCancel')}
      onSave={action('onSave')}
    />
  ),

  name: 'with title',
};

export const WithName: StoryObj = {
  render: () => (
    <CustomElementModal
      title="Edit custom element"
      name="My Chart"
      description=""
      onCancel={action('onCancel')}
      onSave={action('onSave')}
    />
  ),

  name: 'with name',
};

export const WithDescription: StoryObj = {
  render: () => (
    <CustomElementModal
      title="Edit custom element"
      description="best element ever"
      onCancel={action('onCancel')}
      onSave={action('onSave')}
    />
  ),

  name: 'with description',
};

export const WithImage: StoryObj = {
  render: (_, props) => (
    <CustomElementModal
      title="Edit custom element"
      image={elasticLogo}
      onCancel={action('onCancel')}
      onSave={action('onSave')}
    />
  ),

  name: 'with image',
};
