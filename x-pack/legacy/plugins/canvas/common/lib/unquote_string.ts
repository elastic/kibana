/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Removes single or double quotes if any exist around the given string
 * @param str the string to unquote
 * @returns the unquoted string
 */
export const unquoteString = (str: string): string => {
  if (/^"/.test(str)) {
    return str.replace(/^"(.+(?="$))"$/, '$1');
  }
  if (/^'/.test(str)) {
    return str.replace(/^'(.+(?='$))'$/, '$1');
  }
  return str;
};
