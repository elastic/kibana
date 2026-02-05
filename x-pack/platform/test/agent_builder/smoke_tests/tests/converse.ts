/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { isToolCallStep, platformCoreTools } from '@kbn/agent-builder-common';
import type {
  ChatRequestBodyPayload,
  ChatResponse,
} from '@kbn/agent-builder-plugin/common/http_api/chat';
import type SuperTest from 'supertest';

type SuperTestAgent = SuperTest.Agent;

const converse = async <T = ChatResponse>(
  supertest: SuperTestAgent,
  payload: ChatRequestBodyPayload,
  statusCode = 200
): Promise<T> => {
  const res = await supertest
    .post('/api/agent_builder/converse')
    .set('kbn-xsrf', 'true')
    .send(payload)
    .expect(statusCode);
  return res.body as T;
};

/**
 * Converse API smoke test suite for a connector.
 * Creates a Mocha describe block with tests for simple message, tool execution, and conversation.
 *
 * @param name - Display name for the test suite (e.g., model name or connector ID)
 * @param getConnectorId - The connector ID, or a function that returns it (for dynamic lookup)
 * @param supertest - The supertest agent
 */
export const converseApiSuite = (
  name: string,
  getConnectorId: string | (() => string),
  supertest: SuperTestAgent
): void => {
  const resolveConnectorId = () =>
    typeof getConnectorId === 'string' ? getConnectorId : getConnectorId();

  describe(`Connector: ${name}`, function () {
    it('should respond to simple message', async () => {
      const response = await converse(supertest, {
        input: 'Hello',
        connector_id: resolveConnectorId(),
      });
      expect(response.response.message!.length).to.be.greaterThan(0);
    });

    it('should execute tools', async () => {
      const response = await converse(supertest, {
        input: `Using the "platform_core_list_indices" tool, please list my indices. Only call the tool once.`,
        connector_id: resolveConnectorId(),
      });
      expect(response.response.message!.length).to.be.greaterThan(0);
      const toolCalls = response.steps.filter(isToolCallStep);
      expect(toolCalls.length >= 1).to.be(true);
      expect(toolCalls[0].tool_id).to.eql(platformCoreTools.listIndices);
    });

    it('should continue conversation', async () => {
      const connectorId = resolveConnectorId();
      const response1 = await converse(supertest, {
        input: 'Please say "hello"',
        connector_id: connectorId,
      });
      expect(response1.response.message!.length).to.be.greaterThan(0);

      const response2 = await converse(supertest, {
        conversation_id: response1.conversation_id,
        input: 'Please say it again.',
        connector_id: connectorId,
      });
      expect(response2.response.message!.length).to.be.greaterThan(0);
    });
  });
};
