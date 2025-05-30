/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { ControlSlider, ControlSliderProps } from '../ui/slider_control';

const Template = (args: ControlSliderProps) => (
  <I18nProvider>
    <ControlSlider {...args} />
  </I18nProvider>
);

export default {
  title: 'Random Sampling/Control Slider',
  component: ControlSlider,
};

export const Basic = {
  render: Template.bind({}),
  name: 'basic',

  args: {
    values: [0.00001, 0.0001, 0.001, 0.01, 0.1, 1],
    currentValue: 0.001,
    'data-test-subj': 'test-id',
  },

  argTypes: {
    onChange: {
      action: 'changed',
    },
  },
};

export const Disabled = {
  render: Template.bind({}),
  name: 'disabled',

  args: {
    values: [0.00001, 0.0001, 0.001, 0.01, 0.1, 1],
    currentValue: 0.001,
    disabled: true,
    disabledReason: 'Control was disabled due to X and Y',
    'data-test-subj': 'test-id',
  },

  argTypes: {
    onChange: {
      action: 'changed',
    },
  },
};
