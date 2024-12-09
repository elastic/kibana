/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import { StopGeneratingButton as Component } from './stop_generating_button';

const meta: ComponentMeta<typeof Component> = {
  component: Component,
  title: 'app/Atoms/StopGeneratingButton',
};

export default meta;

export const StopGeneratingButton: ComponentStoryObj<typeof Component> = {
  args: {},
};
