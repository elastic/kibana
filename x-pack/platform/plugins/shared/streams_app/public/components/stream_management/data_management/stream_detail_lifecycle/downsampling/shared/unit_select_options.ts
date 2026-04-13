/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeUnitLabel } from '../../helpers/format_size_units';
import type { PreservedTimeUnit, TimeUnit } from './time_unit_types';

export interface TimeUnitSelectOption {
  value: PreservedTimeUnit;
  text: string;
}

export const isPreservedNonDefaultUnit = (unit: PreservedTimeUnit): boolean =>
  unit === 'ms' || unit === 'micros' || unit === 'nanos';

/**
 * Builds select options that always include the default d/h/m/s options and, when relevant,
 * appends a non-default unit that can be present in persisted config (`ms`, `micros`, `nanos`)
 * so it can be displayed and preserved.
 */
export const getUnitSelectOptions = (
  baseTimeUnitOptions: ReadonlyArray<{ value: TimeUnit; text: string }>,
  currentUnit: PreservedTimeUnit
): TimeUnitSelectOption[] => {
  let unitOptions: TimeUnitSelectOption[] = baseTimeUnitOptions.map((o) => ({
    value: o.value,
    text: o.text,
  }));

  if (isPreservedNonDefaultUnit(currentUnit) && !unitOptions.some((o) => o.value === currentUnit)) {
    unitOptions = [...unitOptions, { value: currentUnit, text: getTimeUnitLabel(currentUnit) }];
  }

  return unitOptions;
};
