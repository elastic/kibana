/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISO_DATE_REGEX } from '../../constants';

export const validateEndDate = (date: string) => {
  const parsedValue = Date.parse(date);

  if (isNaN(parsedValue)) {
    return `Invalid schedule end date: ${date}`;
  }
  if (parsedValue <= Date.now()) {
    return `Invalid schedule end date as it is in the past: ${date}`;
  }

  if (!ISO_DATE_REGEX.test(date)) {
    return `Invalid end date format: ${date}. Use ISO 8601 YYYY-MM-DDTHH:mm:ss.sssZ`;
  }

  return;
};
