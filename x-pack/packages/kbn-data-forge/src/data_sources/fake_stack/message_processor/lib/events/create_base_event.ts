/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { Moment } from 'moment';
import { MESSAGE_PROCESSOR } from '../../../common/constants';

export function createBaseEvent(
  timestamp: Moment,
  level: 'ERROR' | 'INFO',
  host: string,
  message: string,
  accepted?: number,
  processed?: number,
  latency?: { values: number[]; counts: number[] },
  outcome?: 'success' | 'failure',
  bytes?: number,
  timeSpent?: number
) {
  const event = {
    namespace: MESSAGE_PROCESSOR,
    '@timestamp': timestamp.toISOString(),
    host: { name: host },
    log: {
      level: level || 'INFO',
      logger: MESSAGE_PROCESSOR,
    },
    message,
    tags: [`infra:${MESSAGE_PROCESSOR}`],
  };

  if (accepted != null) {
    set(event, 'processor.accepted', accepted);
  }

  if (processed != null) {
    set(event, 'processor.processed', processed);
  }

  if (latency != null) {
    set(event, 'processor.latency', latency);
  }

  if (outcome != null) {
    set(event, 'processor.outcome', outcome);
  }

  if (bytes != null) {
    set(event, 'processor.bytes', bytes);
  }

  if (timeSpent != null) {
    set(event, 'processor.timeSpent', timeSpent);
  }

  return event;
}
