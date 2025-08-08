/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createShape } from '../shape_factory';
import { SvgElementTypes } from '../types';

export const VerticalBar = createShape({
  viewBox: {
    minX: 0,
    minY: -8,
    width: 1,
    height: 208,
  },
  shapeType: SvgElementTypes.path,
  shapeProps: {
    d: 'M 1 200 L 1 0',
  },
  textAttributes: {
    x: '0',
    y: '-8',
    textAnchor: 'middle',
  },
});
