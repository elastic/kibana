/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createShape } from '../shape_factory';
import { SvgElementTypes } from '../types';

export const HorizontalBar = createShape({
  viewBox: {
    minX: 0,
    minY: 0,
    width: 208,
    height: 1,
  },
  shapeType: SvgElementTypes.path,
  shapeProps: {
    d: 'M 0 1 L 200 1',
  },
  textAttributes: {
    x: 208,
    y: 0,
    textAnchor: 'start',
    dominantBaseline: 'central',
  },
});
