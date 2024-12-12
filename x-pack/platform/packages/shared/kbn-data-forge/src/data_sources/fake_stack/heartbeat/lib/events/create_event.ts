/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { random } from 'lodash';
import { Moment } from 'moment';
import { HEARTBEAT } from '../../../common/constants';

export function createEvent(
  timestamp: Moment,
  source: string,
  url: string,
  outcome: 'success' | 'failure',
  highLatency = false
) {
  return {
    namespace: HEARTBEAT,
    '@timestamp': timestamp,
    tags: [HEARTBEAT, source],
    log: {
      level: 'info',
      logger: HEARTBEAT,
    },
    message: `Pinging ${url} resulted in "${outcome}"`,
    event: {
      action: 'ping',
      outcome,
      duration: (highLatency ? random(1000, 2000) : random(10, 100)) * 1000,
      url,
      type: HEARTBEAT,
    },
  };
}
