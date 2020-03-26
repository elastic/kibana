/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { advancedFilter } from './advanced_filter';
import { debug } from './debug';
import { dropdownFilter } from './dropdown_filter';
import { embeddable } from './embeddable/embeddable';
import { error } from './error';
import { image } from './image';
import { markdown } from './markdown';
import { metric } from './metric';
import { pie } from './pie';
import { plot } from './plot';
import { progress } from './progress';
import { repeatImage } from './repeat_image';
import { revealImage } from './reveal_image';
import { shape } from './shape';
import { table } from './table';
import { text } from './text';
import { timeFilter } from './time_filter';

export const renderFunctions = [
  advancedFilter,
  debug,
  dropdownFilter,
  embeddable,
  error,
  image,
  markdown,
  metric,
  pie,
  plot,
  progress,
  repeatImage,
  revealImage,
  shape,
  table,
  text,
  timeFilter,
];
