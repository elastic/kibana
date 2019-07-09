/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraWaffleMapDataFormat } from '../../lib/lib';
import { formatNumber } from './number';

/**
 * The labels are derived from these two Wikipedia articles.
 * https://en.wikipedia.org/wiki/Kilobit
 * https://en.wikipedia.org/wiki/Kilobyte
 */
const LABELS = {
  [InfraWaffleMapDataFormat.bytesDecimal]: ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
  [InfraWaffleMapDataFormat.bytesBinaryIEC]: [
    'b',
    'Kib',
    'Mib',
    'Gib',
    'Tib',
    'Pib',
    'Eib',
    'Zib',
    'Yib',
  ],
  [InfraWaffleMapDataFormat.bytesBinaryJEDEC]: ['B', 'KB', 'MB', 'GB'],
  [InfraWaffleMapDataFormat.bitsDecimal]: [
    'bit',
    'kbit',
    'Mbit',
    'Gbit',
    'Tbit',
    'Pbit',
    'Ebit',
    'Zbit',
    'Ybit',
  ],
  [InfraWaffleMapDataFormat.bitsBinaryIEC]: [
    'bit',
    'Kibit',
    'Mibit',
    'Gibit',
    'Tibit',
    'Pibit',
    'Eibit',
    'Zibit',
    'Yibit',
  ],
  [InfraWaffleMapDataFormat.bitsBinaryJEDEC]: ['bit', 'Kbit', 'Mbit', 'Gbit'],
  [InfraWaffleMapDataFormat.abbreviatedNumber]: ['', 'K', 'M', 'B', 'T'],
};

const BASES = {
  [InfraWaffleMapDataFormat.bytesDecimal]: 1000,
  [InfraWaffleMapDataFormat.bytesBinaryIEC]: 1024,
  [InfraWaffleMapDataFormat.bytesBinaryJEDEC]: 1024,
  [InfraWaffleMapDataFormat.bitsDecimal]: 1000,
  [InfraWaffleMapDataFormat.bitsBinaryIEC]: 1024,
  [InfraWaffleMapDataFormat.bitsBinaryJEDEC]: 1024,
  [InfraWaffleMapDataFormat.abbreviatedNumber]: 1000,
};

const BIT_BASES = [
  InfraWaffleMapDataFormat.bitsBinaryJEDEC,
  InfraWaffleMapDataFormat.bitsBinaryIEC,
  InfraWaffleMapDataFormat.bitsDecimal,
];

export const createBytesFormatter = (format: InfraWaffleMapDataFormat) => (bytes: number) => {
  const labels = LABELS[format];
  const base = BASES[format];
  const value = BIT_BASES.includes(format) ? bytes * 8 : bytes;
  // Use an exponetial equation to get the power to determine which label to use. If the power
  // is greater then the max label then use the max label.
  const power = Math.min(Math.floor(Math.log(Math.abs(value)) / Math.log(base)), labels.length - 1);
  if (power < 0) {
    return `${formatNumber(value)}${labels[0]}`;
  }
  return `${formatNumber(value / Math.pow(base, power))}${labels[power]}`;
};
