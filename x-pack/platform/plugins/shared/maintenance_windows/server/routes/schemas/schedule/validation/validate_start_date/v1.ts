/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISO_DATE_REGEX } from '../../constants';

export const validateStartDate = (date: string) => {
  const parsedValue = Date.parse(date);

  if (isNaN(parsedValue)) {
    return `Invalid schedule start date: ${date}`;
  }
  if (!ISO_DATE_REGEX.test(date)) {
    return `Invalid schedule start date format: ${date}. Use ISO 8601 YYYY-MM-DDTHH:mm:ss.sssZ`;
  }

  return;
};
