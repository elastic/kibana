/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpanRaw } from '../raw/span_raw';
import type { Agent } from './fields/agent';

export interface Span extends SpanRaw {
  agent: Agent;
}
