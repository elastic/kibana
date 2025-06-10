/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { getAvailableShapes } from '../../../../canvas_plugin_src/renderers/shape';
import { ShapePicker } from '../shape_picker';

export default {
  title: 'components/Shapes/ShapePicker',
};

export const Default = {
  render: () => <ShapePicker shapes={getAvailableShapes()} onChange={action('onChange')} />,

  name: 'default',
};
