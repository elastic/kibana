/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createShape } from '..';

export const Bookmark = createShape({
  viewBox: {
    minX: 0,
    minY: 0,
    width: 60,
    height: 100,
  },
  shapeProps: {
    points: '0,0 60,0 60,95 30,75 0,95 0,0',
  },
});
