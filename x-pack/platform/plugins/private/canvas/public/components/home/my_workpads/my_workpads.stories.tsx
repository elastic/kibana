/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';

import { reduxDecorator } from '../../../../storybook';
import { argTypes } from '../../../../storybook/constants';

import { MyWorkpads as Component } from './my_workpads';

const { workpadCount, useStaticData } = argTypes;

export default {
  title: 'Home/Tabs/My Workpads',
  component: Component,
  argTypes: {
    workpadCount,
    useStaticData,
  },
  decorators: [reduxDecorator()],
  parameters: {},
};

export const MyWorkpads = () => (
  <EuiPanel>
    <Component />
  </EuiPanel>
);
