/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FIELD_NAME_TRUNCATE_LENGTH = 32;

export const truncateMiddle = (value: string, maxLength: number = FIELD_NAME_TRUNCATE_LENGTH) => {
  if (!value || value.length <= maxLength) return value;
  if (maxLength <= 1) return value.slice(0, maxLength);
  return `${value.slice(0, maxLength - 1)}…`;
};
