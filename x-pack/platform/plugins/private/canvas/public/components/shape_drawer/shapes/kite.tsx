/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createShape } from '..';

export const Kite = createShape({
  viewBox: {
    minX: 0,
    minY: 0,
    width: 100,
    height: 150,
  },
  shapeProps: {
    points: '50,10 10,50 50,140 90,50',
  },
});
