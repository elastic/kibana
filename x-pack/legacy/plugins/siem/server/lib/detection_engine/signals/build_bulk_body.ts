/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SignalSourceHit, SignalHit } from './types';
import { buildRule } from './build_rule';
import { buildSignal } from './build_signal';
import { buildEventTypeSignal } from './build_event_type_signal';
import { RuleTypeParams } from '../types';

interface BuildBulkBodyParams {
  doc: SignalSourceHit;
  ruleParams: RuleTypeParams;
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  interval: string;
  enabled: boolean;
  tags: string[];
}

// format search_after result for signals index.
export const buildBulkBody = ({
  doc,
  ruleParams,
  id,
  name,
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
  interval,
  enabled,
  tags,
}: BuildBulkBodyParams): SignalHit => {
  const rule = buildRule({
    ruleParams,
    id,
    name,
    enabled,
    createdAt,
    createdBy,
    updatedAt,
    updatedBy,
    interval,
    tags,
  });
  const signal = buildSignal(doc, rule);
  const event = buildEventTypeSignal(doc);
  const signalHit: SignalHit = {
    ...doc._source,
    '@timestamp': new Date().toISOString(),
    event,
    signal,
  };
  return signalHit;
};
