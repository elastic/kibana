/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SignalSourceHit } from './types';

export const buildEventTypeSignal = (doc: SignalSourceHit): object => {
  if (doc._source.event != null && doc._source.event instanceof Object) {
    return { ...doc._source.event, kind: 'signal' };
  } else {
    return { kind: 'signal' };
  }
};
