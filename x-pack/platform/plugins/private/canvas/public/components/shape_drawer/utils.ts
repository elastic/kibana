/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SvgConfig } from './types';

export const getDefaultShapeData = (): SvgConfig => ({
  viewBox: {
    minX: 0,
    minY: 0,
    width: 0,
    height: 0,
  },
  shapeProps: {},
});
