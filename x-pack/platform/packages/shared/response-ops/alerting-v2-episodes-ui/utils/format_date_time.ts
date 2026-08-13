/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { DEFAULT_DATE_FORMAT } from '../constants';

export const formatDateTime = (value: string, dateFormat?: string): string =>
  moment(value).format(dateFormat ?? DEFAULT_DATE_FORMAT);
