/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Moment } from 'moment';

export interface License {
  status: string;
  type: string;
  expiry_date_in_millis: number;
}

export interface AlertState {
  expired_check_date_in_millis: number | Moment;
}
