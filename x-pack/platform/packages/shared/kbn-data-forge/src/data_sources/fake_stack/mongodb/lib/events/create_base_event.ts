/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { Moment } from 'moment';
import { MONGODB } from '../../../common/constants';

export function createBaseEvent(
  timestamp: Moment,
  host: string,
  context: string,
  component: string,
  message: string,
  level?: 'ERROR' | 'INFO',
  database?: string,
  collection?: string,
  action?: string
) {
  const event = {
    namespace: MONGODB,
    '@timestamp': timestamp.toISOString(),
    host: { name: host },
    mongodb: {
      context,
      component,
    },
    log: {
      level: level || 'INFO',
      logger: MONGODB,
    },
    message,
    tags: [`infra:${MONGODB}`],
  };

  if (database) {
    set(event, 'mongodb.database', database);
  }

  if (collection) {
    set(event, 'mongodb.collection', collection);
  }

  if (action) {
    set(event, 'mongodb.action', action);
  }

  return event;
}
