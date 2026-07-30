/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeUnitLabel } from '../../../../../../util/format_size_units';
import type { TimeUnit } from './time_unit_types';

export const TIME_UNIT_OPTIONS: ReadonlyArray<{ value: TimeUnit; text: string }> = [
  { value: 's', text: getTimeUnitLabel('s') },
  { value: 'm', text: getTimeUnitLabel('m') },
  { value: 'h', text: getTimeUnitLabel('h') },
  { value: 'd', text: getTimeUnitLabel('d') },
];
