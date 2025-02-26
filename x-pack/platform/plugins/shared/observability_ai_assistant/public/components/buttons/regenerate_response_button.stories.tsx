/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Meta, StoryObj } from '@storybook/react';
import { RegenerateResponseButton as Component } from './regenerate_response_button';

const meta: Meta<typeof Component> = {
  component: Component,
  title: 'app/Atoms/RegenerateResponseButton',
};

export default meta;

export const RegenerateResponseButton: StoryObj<typeof Component> = {
  args: {},
};
