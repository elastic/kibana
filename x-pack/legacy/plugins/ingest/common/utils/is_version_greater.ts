/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function isVersionGreater(v1: string, v2: string): 1 | 0 | -1 {
  const v1parts = v1.split('.');
  const v2parts = v2.split('.');

  function isValidPart(x: string) {
    return /^\d+$/.test(x);
  }

  if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
    throw new Error('versions are not valid');
  }

  while (v1parts.length < v2parts.length) v1parts.push('0');
  while (v2parts.length < v1parts.length) v2parts.push('0');

  for (let i = 0; i < v1parts.length; ++i) {
    if (v2parts.length === i) {
      return 1;
    }

    if (v1parts[i] === v2parts[i]) {
      continue;
    } else if (v1parts[i] > v2parts[i]) {
      return 1;
    } else {
      return -1;
    }
  }

  if (v1parts.length !== v2parts.length) {
    return -1;
  }

  return 0;
}
