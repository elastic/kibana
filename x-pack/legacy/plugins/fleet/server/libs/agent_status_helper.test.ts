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
import { AgentStatusHelper } from './agent_status_helper';
import { AgentEvent } from '../../common/types/domain_data';

describe('AgentStatusHelper', () => {
  describe('getAgentStatus', () => {
    it('return inactive for a not active agent', () => {
      const status = AgentStatusHelper.getAgentStatus({ active: false } as Agent);

      expect(status).toBe('inactive');
    });
    describe('EPHEMERAL agents', () => {
      it('return online for an active agent', () => {
        const status = AgentStatusHelper.getAgentStatus({
          active: true,
          type: AGENT_TYPE_EPHEMERAL,
          last_checkin: new Date().toISOString(),
          current_error_events: [] as AgentEvent[],
        } as Agent);

        expect(status).toBe('online');
      });
      it('return inactive for an agent that did not checkin recently', () => {
        const status = AgentStatusHelper.getAgentStatus({
          active: true,
          type: AGENT_TYPE_EPHEMERAL,
          last_checkin: new Date(Date.now() - 10 * AGENT_POLLING_THRESHOLD_MS).toISOString(),
          current_error_events: [] as AgentEvent[],
        } as Agent);

        expect(status).toBe('inactive');
      });
    });
    describe('TEMPORARY agents', () => {
      it('return online for an active agent', () => {
        const status = AgentStatusHelper.getAgentStatus({
          active: true,
          type: AGENT_TYPE_TEMPORARY,
          last_checkin: new Date().toISOString(),
          current_error_events: [] as AgentEvent[],
        } as Agent);

        expect(status).toBe('online');
      });
      it('return offline for an agent that did not checkin recently', () => {
        const status = AgentStatusHelper.getAgentStatus({
          active: true,
          type: AGENT_TYPE_TEMPORARY,
          last_checkin: new Date(Date.now() - 10 * AGENT_POLLING_THRESHOLD_MS).toISOString(),
          current_error_events: [] as AgentEvent[],
        } as Agent);

        expect(status).toBe('offline');
      });
    });
    describe('PERMANENT agents', () => {
      it('return online for an active agent', () => {
        const status = AgentStatusHelper.getAgentStatus({
          active: true,
          type: AGENT_TYPE_PERMANENT,
          last_checkin: new Date().toISOString(),
          current_error_events: [] as AgentEvent[],
        } as Agent);

        expect(status).toBe('online');
      });
      it('return warning for a agent that did not check in the last 60 seconds', () => {
        const status = AgentStatusHelper.getAgentStatus({
          active: true,
          type: AGENT_TYPE_PERMANENT,
          last_checkin: new Date(Date.now() - 2 * AGENT_POLLING_THRESHOLD_MS).toISOString(),
          current_error_events: [] as AgentEvent[],
        } as Agent);

        expect(status).toBe('warning');
      });
      it('return error for a inactive agent', () => {
        const status = AgentStatusHelper.getAgentStatus({
          active: true,
          type: AGENT_TYPE_PERMANENT,
          last_checkin: new Date(Date.now() - 5 * AGENT_POLLING_THRESHOLD_MS).toISOString(),
          current_error_events: [] as AgentEvent[],
        } as Agent);

        expect(status).toBe('error');
      });
      it('return error if the agent has currently errors', () => {
        const status = AgentStatusHelper.getAgentStatus({
          active: true,
          type: AGENT_TYPE_PERMANENT,
          last_checkin: new Date(Date.now()).toISOString(),
          current_error_events: [
            {
              message: 'Invalid path /foo',
              type: 'ERROR',
              subtype: 'CONFIG',
            } as AgentEvent,
          ],
        } as Agent);

        expect(status).toBe('error');
      });
    });
  });
});
