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

type TestType = 'all' | 'simple' | 'tool' | 'conversation';

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
 * Run a simple message test
 */
const runSimpleMessageTest = async (
  connectorId: string,
  supertest: SuperTestAgent
): Promise<void> => {
  const response = await converse(supertest, {
    input: 'Hello',
    connector_id: connectorId,
  });
  expect(response.response.message!.length).to.be.greaterThan(0);
};

/**
 * Run a tool execution test
 */
const runToolExecutionTest = async (
  connectorId: string,
  supertest: SuperTestAgent
): Promise<void> => {
  const response = await converse(supertest, {
    input: `Using the "platform_core_list_indices" tool, please list my indices. Only call the tool once.`,
    connector_id: connectorId,
  });
  expect(response.response.message!.length).to.be.greaterThan(0);
  const toolCalls = response.steps.filter(isToolCallStep);
  expect(toolCalls.length >= 1).to.be(true);
  expect(toolCalls[0].tool_id).to.eql(platformCoreTools.listIndices);
};

/**
 * Run a conversation continuation test
 */
const runConversationTest = async (
  connectorId: string,
  supertest: SuperTestAgent
): Promise<void> => {
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
};

/**
 * Runs converse smoke tests for a connector
 *
 * @param connectorId - The connector ID to test
 * @param supertest - The supertest agent
 * @param testType - Which test(s) to run: 'all', 'simple', 'tool', or 'conversation'
 */
export const runConverseTests = async (
  connectorId: string,
  supertest: SuperTestAgent,
  testType: TestType = 'all'
): Promise<void> => {
  switch (testType) {
    case 'simple':
      await runSimpleMessageTest(connectorId, supertest);
      break;
    case 'tool':
      await runToolExecutionTest(connectorId, supertest);
      break;
    case 'conversation':
      await runConversationTest(connectorId, supertest);
      break;
    case 'all':
    default:
      await runSimpleMessageTest(connectorId, supertest);
      await runToolExecutionTest(connectorId, supertest);
      await runConversationTest(connectorId, supertest);
      break;
  }
};
