/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { dropdownControl } from './dropdownControl';
import { getCell } from './getCell';
import { image } from './image';
import { markdown } from './markdown';
import { metricInitializer } from './metric';
import { pie } from './pie';
import { plot } from './plot';
import { progress } from './progress';
import { repeatImage } from './repeatImage';
import { revealImage } from './revealImage';
import { render } from './render';
import { shape } from './shape';
import { table } from './table';
import { timefilterControl } from './timefilterControl';

import { SetupInitializer } from '../../plugin';

export const viewSpecs = [
  dropdownControl,
  getCell,
  image,
  markdown,
  pie,
  plot,
  progress,
  repeatImage,
  revealImage,
  render,
  shape,
  table,
  timefilterControl,
];

export const viewInitializers = [metricInitializer];

export const initializeViews: SetupInitializer<unknown> = (core, plugins) => {
  return [...viewSpecs, ...viewInitializers.map(initializer => initializer(core, plugins))];
};
