/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Shape } from '../../../../canvas_plugin_src/renderers/shape';
import { ShapePreview } from '../shape_preview';

export default {
  title: 'components/Shapes/ShapePreview',
};

export const Arrow = {
  render: () => <ShapePreview shape={Shape.ARROW} />,
  name: 'arrow',
};

export const Square = {
  render: () => <ShapePreview shape={Shape.SQUARE} />,
  name: 'square',
};
