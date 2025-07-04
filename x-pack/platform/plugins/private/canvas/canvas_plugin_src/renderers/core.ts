/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debugRendererFactory } from './debug';
import { errorRendererFactory } from './error';
import { imageRendererFactory } from './image';
import { markdownFactory } from './markdown';
import { metricRendererFactory } from './metric';
import { pie } from './pie';
import { plot } from './plot';
import { repeatImageRendererFactory } from './repeat_image';
import { revealImageRendererFactory } from './reveal_image';
import { progressRendererFactory } from './progress';
import { shapeRendererFactory } from './shape';
import { textFactory } from './text';
import { tableFactory } from './table';

export const renderFunctions = [pie, plot];

export const renderFunctionFactories = [
  debugRendererFactory,
  errorRendererFactory,
  imageRendererFactory,
  markdownFactory,
  markdownFactory,
  metricRendererFactory,
  progressRendererFactory,
  repeatImageRendererFactory,
  revealImageRendererFactory,
  shapeRendererFactory,
  tableFactory,
  textFactory,
];
