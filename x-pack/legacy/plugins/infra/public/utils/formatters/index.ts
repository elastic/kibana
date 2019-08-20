/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Mustache from 'mustache';
import { InfraFormatterType, InfraWaffleMapDataFormat } from '../../lib/lib';
import { createBytesFormatter } from './bytes';
import { formatNumber } from './number';
import { formatPercent } from './percent';

export const FORMATTERS = {
  [InfraFormatterType.number]: formatNumber,
  // Because the implimentation for formatting large numbers is the same as formatting
  // bytes we are re-using the same code, we just format the number using the abbreviated number format.
  [InfraFormatterType.abbreviatedNumber]: createBytesFormatter(
    InfraWaffleMapDataFormat.abbreviatedNumber
  ),
  // bytes in bytes formatted string out
  [InfraFormatterType.bytes]: createBytesFormatter(InfraWaffleMapDataFormat.bytesDecimal),
  // bytes in bits formatted string out
  [InfraFormatterType.bits]: createBytesFormatter(InfraWaffleMapDataFormat.bitsDecimal),
  [InfraFormatterType.percent]: formatPercent,
};

export const createFormatter = (format: InfraFormatterType, template: string = '{{value}}') => (
  val: string | number
) => {
  if (val == null) {
    return '';
  }
  const fmtFn = FORMATTERS[format];
  const value = fmtFn(Number(val));
  return Mustache.render(template, { value });
};
