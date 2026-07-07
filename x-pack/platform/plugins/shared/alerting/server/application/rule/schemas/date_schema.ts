/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { schema } from '@kbn/config-schema';
import { ISO_DATE_REGEX } from '../../../../common/routes/schedule/constants';

const validateDate = (string: Date) => {
  if (moment(string).isValid()) {
    return;
  }
  return `string is not a valid date: ${string}`;
};

const validateIsoDate = (value: string) => {
  if (!ISO_DATE_REGEX.test(value) || isNaN(Date.parse(value))) {
    return `string is not a valid ISO date: ${value}. Use ISO 8601 YYYY-MM-DDTHH:mm:ss.sssZ`;
  }
};

export const dateSchema = schema.any({ validate: validateDate });
export const isoDateSchema = schema.string({ validate: validateIsoDate });
