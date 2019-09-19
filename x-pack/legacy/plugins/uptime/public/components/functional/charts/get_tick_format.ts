/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getTickFormat = (value?: number | null): string => {
  const res = Number(value);
  if (isNaN(res) || value === null) {
    return 'N/A';
  }
  return res.toFixed();
};
