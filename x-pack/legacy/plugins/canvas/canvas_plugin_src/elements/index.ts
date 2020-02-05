/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { applyElementStrings } from '../../i18n/elements';
import { areaChart } from './area_chart';
import { bubbleChart } from './bubble_chart';
import { debug } from './debug';
import { donut } from './donut';
import { dropdownFilter } from './dropdown_filter';
import { horizontalBarChart } from './horizontal_bar_chart';
import { horizontalProgressBar } from './horizontal_progress_bar';
import { horizontalProgressPill } from './horizontal_progress_pill';
import { image } from './image';
import { lineChart } from './line_chart';
import { markdown } from './markdown';
import { metric } from './metric';
import { pie } from './pie';
import { plot } from './plot';
import { progressGauge } from './progress_gauge';
import { progressSemicircle } from './progress_semicircle';
import { progressWheel } from './progress_wheel';
import { repeatImage } from './repeat_image';
import { revealImage } from './reveal_image';
import { shape } from './shape';
import { table } from './table';
import { tiltedPie } from './tilted_pie';
import { timeFilter } from './time_filter';
import { verticalBarChart } from './vert_bar_chart';
import { verticalProgressBar } from './vertical_progress_bar';
import { verticalProgressPill } from './vertical_progress_pill';

export const elementSpecs = applyElementStrings([
  areaChart,
  bubbleChart,
  debug,
  donut,
  dropdownFilter,
  image,
  horizontalBarChart,
  horizontalProgressBar,
  horizontalProgressPill,
  lineChart,
  markdown,
  metric,
  pie,
  plot,
  progressGauge,
  progressSemicircle,
  progressWheel,
  repeatImage,
  revealImage,
  shape,
  table,
  tiltedPie,
  timeFilter,
  verticalBarChart,
  verticalProgressBar,
  verticalProgressPill,
]);
