/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createShape } from '..';

export const Star = createShape({
  viewBox: {
    minX: 0,
    minY: 0,
    width: 100,
    height: 100,
  },
  shapeProps: {
    points:
      '41.183, 37.865 12.652, 37.865 35.734, 54.635 26.917, 81.771 50.000, 65.000 73.265, 81.904 64.266, 54.635 87.348, 37.865 58.817, 37.865 50.07, 10.515',
  },
});
