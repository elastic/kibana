/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const stringToInteger = (value?: string | number): number | undefined => {
  const num = Number(value);

  if (isNaN(num)) {
    return;
  }

  return num;
};

export const stringToIntegerWithDefault = (
  value: string | number,
  defaultValue: number
): number => {
  const valueAsInteger = stringToInteger(value);

  return valueAsInteger && valueAsInteger > 0 ? valueAsInteger : defaultValue;
};
