/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';
import { MESSAGE_PROCESSOR_HOSTS } from '../../../common/constants';
import { createBaseEvent } from './create_base_event';

export function createStartupEvents(timestamp: Moment) {
  return MESSAGE_PROCESSOR_HOSTS.map((host) =>
    createBaseEvent(timestamp, 'INFO', host, 'Message processor starting up...')
  );
}
