/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createShape } from '../shape_factory';
import { SvgElementTypes } from '../types';

export const Wheel = createShape({
  viewBox: {
    minX: 0,
    minY: 0,
    width: 120,
    height: 120,
  },
  shapeType: SvgElementTypes.path,
  shapeProps: {
    d: 'M 60 0 A 60 60 0 1 1 60 120 A 60 60 0 1 1 60 0 Z',
  },
  textAttributes: {
    x: '60',
    y: '60',
    textAnchor: 'middle',
    dominantBaseline: 'central',
  },
});
