/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import moment from 'moment';

export const convertStringToMoment = (value: string): Moment => moment(value);

export const convertStringToMomentOptional = (value?: string): Moment | undefined =>
  value ? moment(value) : undefined;

export const convertMomentToString = (value: Moment): string => value?.toISOString();

export const convertMomentToStringOptional = (value?: Moment): string => value?.toISOString() ?? '';
