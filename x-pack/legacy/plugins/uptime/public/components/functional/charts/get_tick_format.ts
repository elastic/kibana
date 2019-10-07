/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getTickFormat = (value?: number | null): string => {
  const parsedNumber = Number(value);
  if (isNaN(parsedNumber) || value === null) {
    return 'N/A';
  }
  return parsedNumber.toFixed();
};
