/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventFunction } from '../../../../../types';
import { MONGODB, MONGO_DB_GATEWAY } from '../../../common/constants';
import { createEvent } from './create_event';

export const bad: EventFunction = (_schedule, timestamp) => {
  return [createEvent(timestamp, MONGODB, `https://${MONGO_DB_GATEWAY}`, 'failure')];
};
