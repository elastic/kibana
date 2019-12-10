/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SignalSourceHit, Signal } from './types';
import { OutputRuleAlertRest } from '../types';

export const buildSignal = (doc: SignalSourceHit, rule: Partial<OutputRuleAlertRest>): Signal => {
  const signal: Signal = {
    parent: {
      id: doc._id,
      type: 'event',
      index: doc._index,
      depth: 1,
    },
    original_time: doc._source['@timestamp'],
    status: 'open',
    rule,
  };
  if (doc._source.event != null) {
    return { ...signal, original_event: doc._source.event };
  }
  return signal;
};
