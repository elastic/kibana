/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { errors as alterColumn } from './specs/alterColumn';
import { errors as asset } from './specs/asset';
import { errors as axisConfig } from './specs/axisConfig';
import { errors as compare } from './specs/compare';
import { errors as containerStyle } from './specs/containerStyle';
import { errors as csv } from './specs/csv';
import { errors as date } from './specs/date';
import { errors as demodata } from './specs/demodata';
import { errors as getCell } from './specs/getCell';
import { errors as image } from './specs/image';
import { errors as joinRows } from './specs/join_rows';
import { errors as math } from './specs/math';
import { errors as ply } from './specs/ply';
import { errors as pointseries } from './specs/pointseries';
import { errors as progress } from './specs/progress';
import { errors as revealImage } from './specs/revealImage';
import { errors as timefilter } from './specs/timefilter';
import { errors as to } from './specs/to';

export const getFunctionErrors = () => ({
  alterColumn,
  asset,
  axisConfig,
  compare,
  containerStyle,
  csv,
  date,
  demodata,
  getCell,
  image,
  joinRows,
  math,
  ply,
  pointseries,
  progress,
  revealImage,
  timefilter,
  to,
});
