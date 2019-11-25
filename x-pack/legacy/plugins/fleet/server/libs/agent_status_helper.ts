/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AGENT_TYPE_TEMPORARY,
  AGENT_POLLING_THRESHOLD_MS,
  AGENT_TYPE_PERMANENT,
  AGENT_TYPE_EPHEMERAL,
} from '../../common/constants';
import { Agent } from '../repositories/agents/types';
import { AgentStatus } from '../../common/types/domain_data';

export class AgentStatusHelper {
  public static buildKueryForOfflineAgents(now: number = Date.now()) {
    return `agents.type:${AGENT_TYPE_TEMPORARY} AND agents.last_checkin < ${now -
      3 * AGENT_POLLING_THRESHOLD_MS}`;
  }

  public static buildKueryForErrorAgents(now: number = Date.now()) {
    return `agents.type:${AGENT_TYPE_PERMANENT} AND agents.last_checkin < ${now -
      4 * AGENT_POLLING_THRESHOLD_MS}`;
  }

  public static getAgentStatus(agent: Agent, now: number = Date.now()): AgentStatus {
    const { type, last_checkin: lastCheckIn } = agent;
    const msLastCheckIn = new Date(lastCheckIn || 0).getTime();
    const msSinceLastCheckIn = new Date().getTime() - msLastCheckIn;
    const intervalsSinceLastCheckIn = Math.floor(msSinceLastCheckIn / AGENT_POLLING_THRESHOLD_MS);

    if (!agent.active) {
      return 'inactive';
    }

    switch (type) {
      case AGENT_TYPE_PERMANENT:
        if (intervalsSinceLastCheckIn >= 4) {
          return 'error';
        }
        if (intervalsSinceLastCheckIn >= 2) {
          return 'warning';
        }
      case AGENT_TYPE_TEMPORARY:
        if (intervalsSinceLastCheckIn >= 3) {
          return 'offline';
        }
      case AGENT_TYPE_EPHEMERAL:
        if (intervalsSinceLastCheckIn >= 3) {
          return 'inactive';
        }
    }
    return 'online';
  }
}
