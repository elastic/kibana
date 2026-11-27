/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta } from '@storybook/react';
import { ActionsMenu } from './actions_menu';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';

const meta: Meta = {
  title: 'ActionsMenu',
  component: ActionsMenu,
  decorators: [kibanaReactDecorator],
};

export default meta;

export const Default = {
  args: {
    onActionSelected: () => {},
  },
};
