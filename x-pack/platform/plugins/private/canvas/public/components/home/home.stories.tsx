/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { reduxDecorator } from '../../../storybook';
import { argTypes } from '../../../storybook/constants';

import { Home } from './home';

export default {
  title: 'Home',
  component: Home,
  argTypes,
  decorators: [reduxDecorator()],
  parameters: {},
};

export const HomePage = () => <Home />;
