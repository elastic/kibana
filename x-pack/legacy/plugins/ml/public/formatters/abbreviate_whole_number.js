/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Formatter to abbreviate large whole numbers with metric prefixes.
 * Uses numeral.js to format numbers longer than the specified number of
 * digits with metric abbreviations e.g. 12345 as 12k, or 98000000 as 98m.
 */
import numeral from '@elastic/numeral';

export function abbreviateWholeNumber(value, maxDigits = 3) {
  if (Math.abs(value) < Math.pow(10, maxDigits)) {
    return value;
  } else {
    return numeral(value).format('0a');
  }
}
