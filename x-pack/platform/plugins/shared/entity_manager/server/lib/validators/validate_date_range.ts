/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import { Moment } from 'moment';
import { AssetsValidationError } from './validation_error';

export function validateStringDateRange(from: string, to?: string) {
  const parsedFrom = validateESDate(from);
  validateDateInPast(parsedFrom);
  if (to) {
    const parsedTo = validateESDate(to);
    validateDateRangeOrder(parsedFrom, parsedTo);
  }
}

export function validateDateInPast(date: Moment) {
  const now = datemath.parse('now')!;
  if (date.isAfter(now)) {
    throw new AssetsValidationError(`Date cannot be in the future ${date.toISOString()}`, {
      statusCode: 400,
    });
  }
}

export function validateDateRangeOrder(from: Moment, to: Moment) {
  if (from.isAfter(to)) {
    throw new AssetsValidationError(
      `Invalid date range - given "from" value (${from.toISOString()}) is after given "to" value (${to.toISOString()})`,
      {
        statusCode: 400,
      }
    );
  }
}

export function validateESDate(dateString: string) {
  try {
    const parsed = datemath.parse(dateString);
    if (typeof parsed === 'undefined') {
      throw new Error('Date string was parsed as undefined');
    }
    if (parsed.toString() === 'Invalid date') {
      throw new Error('Date string produced an invalid date');
    }
    return parsed;
  } catch (error: any) {
    throw new AssetsValidationError(
      `"${dateString}" is not a valid Elasticsearch date value - ${error}`,
      {
        statusCode: 400,
      }
    );
  }
}
