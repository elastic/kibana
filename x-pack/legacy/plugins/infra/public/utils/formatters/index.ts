/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Mustache from 'mustache';
import { InfraFormatterType, InfraWaffleMapDataFormat } from '../../lib/lib';
import { createDataFormatter } from './data';
import { formatNumber } from './number';
import { formatPercent } from './percent';

export const FORMATTERS = {
  [InfraFormatterType.number]: formatNumber,
  [InfraFormatterType.abbreviatedNumber]: createDataFormatter(
    InfraWaffleMapDataFormat.abbreviatedNumber
  ),
  [InfraFormatterType.bytes]: createDataFormatter(InfraWaffleMapDataFormat.bytesDecimal),
  [InfraFormatterType.bits]: createDataFormatter(InfraWaffleMapDataFormat.bitsDecimal),
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
