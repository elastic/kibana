/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Converse API Smoke Tests
 *
 * These tests run IMPERATIVELY (not via Mocha describe/it blocks) because:
 *
 * 1. EIS (Elastic Inference Service) connectors are discovered dynamically at runtime
 *    via Cloud Connected Mode (CCM). We don't know which models are available until
 *    the test's before() hook runs - AFTER Mocha has already registered all tests.
 *
 * 2. Mocha requires describe/it blocks to be registered synchronously at file load time.
 *    You cannot dynamically create test suites based on async data discovered later.
 *
 * 3. By using an imperative approach, the same runConverseTests() function works for:
 *    - Preconfigured connectors (known at load time)
 *    - EIS dynamic connectors (discovered at runtime)
 *
 * Trade-off: We lose granular per-test Mocha reporting, but gain a single source of
 * truth for test logic that works consistently across all connector types.
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
 * Runs all converse smoke tests for a connector
 */
export const runConverseTests = async (
  connectorId: string,
  supertest: SuperTestAgent
): Promise<void> => {
  // Test 1: Simple message
  const response1 = await converse(supertest, {
    input: 'Hello',
    connector_id: connectorId,
  });
  expect(response1.response.message!.length).to.be.greaterThan(0);

  // Test 2: Tool execution
  const response2 = await converse(supertest, {
    input: `Using the "platform_core_list_indices" tool, please list my indices. Only call the tool once.`,
    connector_id: connectorId,
  });
  expect(response2.response.message!.length).to.be.greaterThan(0);
  const toolCalls = response2.steps.filter(isToolCallStep);
  expect(toolCalls.length >= 1).to.be(true);
  expect(toolCalls[0].tool_id).to.eql(platformCoreTools.listIndices);

  // Test 3: Conversation continuation
  const response3a = await converse(supertest, {
    input: 'Please say "hello"',
    connector_id: connectorId,
  });
  expect(response3a.response.message!.length).to.be.greaterThan(0);

  const response3b = await converse(supertest, {
    conversation_id: response3a.conversation_id,
    input: 'Please say it again.',
    connector_id: connectorId,
  });
  expect(response3b.response.message!.length).to.be.greaterThan(0);
};
