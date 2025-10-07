/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlCustomUrlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils';

// Replaces all instances of dollar delimited tokens in the specified String
// with corresponding values from the supplied object, optionally
// encoding the replacement for a URI component.
// For example if passed a String 'http://www.google.co.uk/#q=airline+code+$airline$'
// and valuesByTokenName of {"airline":"AAL"}, will return
// 'http://www.google.co.uk/#q=airline+code+AAL'.
// If a corresponding key is not found in valuesByTokenName, then the String is not replaced.
export function replaceStringTokens(
  str: string,
  /** Record<string, any> is the same as DataGridItem, not importing it though to avoid a circular dependency issue. */
  valuesByTokenName: MlCustomUrlAnomalyRecordDoc | Record<string, any>,
  encodeForURI: boolean
) {
  return String(str).replace(/\$([^?&$\'"]+)\$/g, (match, name) => {
    // Use lodash get to allow nested JSON fields to be retrieved.
    let tokenValue =
      valuesByTokenName && valuesByTokenName[name] !== undefined ? valuesByTokenName[name] : null;
    if (encodeForURI === true && tokenValue !== null) {
      tokenValue = encodeURIComponent(tokenValue);
    }

    // If property not found string is not replaced.
    return tokenValue !== null ? tokenValue : match;
  });
}
