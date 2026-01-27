/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLTimeSpanLiteral } from '@kbn/esql-language';
import { Builder, TIME_SPAN_UNITS } from '@kbn/esql-language';

const timespanStringRegexp = new RegExp(
  `^["']?([0-9]+)?\\s*?(${TIME_SPAN_UNITS.join('|')})["']?$`,
  'i'
);

export function isTimespanString(str: string): boolean {
  return Boolean(str.match(timespanStringRegexp));
}

export function stringToTimespanLiteral(str: string): ESQLTimeSpanLiteral {
  const match = timespanStringRegexp.exec(str);
  if (!match) {
    throw new Error(`String "${str}" cannot be converted to timespan literal`);
  }
  const [_, quantity, unit] = match;

  return Builder.expression.literal.timespan(
    quantity ? parseInt(quantity, 10) : 1,
    unit.toLowerCase()
  );
}
