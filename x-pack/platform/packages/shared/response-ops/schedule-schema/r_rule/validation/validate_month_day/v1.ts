/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Validates a single RFC 5545 BYMONTHDAY value: 1 to 31 counts forward from the start of the month,
 * -31 to -1 counts backward from the end, and 0 is not a valid day.
 */
export const validateMonthDay = (value: number, fieldName: string) => {
  if (!Number.isInteger(value) || value === 0) {
    return `${fieldName} must be an integer between 1 and 31, or between -31 and -1.`;
  }
};
