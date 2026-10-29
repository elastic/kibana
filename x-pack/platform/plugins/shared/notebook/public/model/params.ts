/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { InputCellDefinition } from '../../common/types';
import { getExposedParamNames, getQueryParamNames } from './references';
import type { CellOutput, InputValue, ParamMap, ParamValue } from './types';

const parseDate = (text: string, now: Date, roundUp: boolean): string => {
  const date = dateMath.parse(text, { roundUp, forceNow: now });
  if (!date?.isValid()) throw new Error(`Invalid date "${text}"`);
  return date.toISOString();
};

/** The params an input binds for its current value, resolving relative time against `now`. */
export const resolveInputParams = (
  cell: InputCellDefinition,
  value: InputValue,
  now: Date
): ParamMap => {
  const { input } = cell;
  const names = getExposedParamNames(cell);
  const bind = (values: ParamValue[]): ParamMap =>
    Object.fromEntries(names.map((name, index) => [name, values[index]]));

  if (input.kind === 'time' && value.kind === 'time') {
    const { from, to } = value.range;
    return bind([parseDate(from, now, false), parseDate(to, now, true)]);
  }
  if (input.kind === 'dropdown' && value.kind === 'dropdown') {
    return bind([value.value]);
  }
  if (input.kind === 'range' && value.kind === 'range') {
    return bind(value.value ?? [null, null]);
  }
  throw new Error(`Input "${cell.name}" is a ${input.kind} input but holds a ${value.kind} value`);
};

/** Binds every param a query references from its parents' input outputs; unbound params are `null`. */
export const buildQueryParams = (
  query: string,
  parentOutputs: ReadonlyArray<CellOutput | undefined>
): ParamMap => {
  const available = new Map(
    parentOutputs.flatMap((output) =>
      output?.kind === 'input' ? Object.entries(output.params) : []
    )
  );
  return Object.fromEntries(
    getQueryParamNames(query).map((name) => [name, available.get(name) ?? null])
  );
};
