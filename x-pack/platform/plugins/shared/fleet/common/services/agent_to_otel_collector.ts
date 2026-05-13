/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_TYPE_OPAMP } from '../constants';
import type { Agent } from '../types';
import type { OtelCollector } from '../types/rest_spec/otel_collector';

export const isOtelCollector = (agent: Pick<Agent, 'type'>): boolean =>
  agent.type === AGENT_TYPE_OPAMP;

export const agentToOtelCollector = (agent: Agent): OtelCollector => ({
  id: agent.id,
  status: agent.status,
  active: agent.active,
  enrolled_at: agent.enrolled_at,
  unenrolled_at: agent.unenrolled_at,
  last_checkin: agent.last_checkin,
  last_checkin_status: agent.last_checkin_status,
  last_checkin_message: agent.last_checkin_message,
  tags: agent.tags,
  namespaces: agent.namespaces,
  identifying_attributes: agent.identifying_attributes,
  non_identifying_attributes: agent.non_identifying_attributes,
  capabilities: agent.capabilities,
  health: agent.health,
  signals: agent.signals,
});
