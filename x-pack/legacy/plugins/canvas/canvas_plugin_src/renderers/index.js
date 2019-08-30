/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { advancedFilter } from './advanced_filter';
import { dropdownFilter } from './dropdown_filter';
import { debug } from './debug';
import { embeddable } from './embeddable';
import { error } from './error';
import { image } from './image';
import { repeatImage } from './repeat_image';
import { revealImage } from './reveal_image';
import { markdown } from './markdown';
import { metric } from './metric';
import { pie } from './pie';
import { plot } from './plot';
import { progress } from './progress';
import { shape } from './shape';
import { table } from './table';
import { timeFilter } from './time_filter';
import { text } from './text';

export const renderFunctions = [
  advancedFilter,
  dropdownFilter,
  debug,
  embeddable,
  error,
  image,
  repeatImage,
  revealImage,
  markdown,
  metric,
  pie,
  plot,
  progress,
  shape,
  table,
  timeFilter,
  text,
];
