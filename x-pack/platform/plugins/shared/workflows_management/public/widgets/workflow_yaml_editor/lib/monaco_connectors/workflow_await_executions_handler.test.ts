/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockHoverContext, createMockStepContext } from './test_utils/mock_factories';
import { WorkflowAwaitExecutionsMonacoConnectorHandler } from './workflow_await_executions_handler';
import { setMockStabilityBadgeThemeForTests } from '../stability/set_mock_stability_badge_theme_for_tests';

jest.mock('@kbn/workflows', () => ({
  getBuiltInStepStability: jest.fn().mockReturnValue(undefined),
}));

describe('WorkflowAwaitExecutionsMonacoConnectorHandler', () => {
  let handler: WorkflowAwaitExecutionsMonacoConnectorHandler;

  beforeEach(() => {
    setMockStabilityBadgeThemeForTests();
    handler = new WorkflowAwaitExecutionsMonacoConnectorHandler();
  });

  it('handles only workflow.awaitExecutions', () => {
    expect(handler.canHandle('workflow.awaitExecutions')).toBe(true);
    expect(handler.canHandle('workflow.executeAsync')).toBe(false);
    expect(handler.canHandle('ai.agent')).toBe(false);
  });

  it('returns null when there is no step context', async () => {
    const context = createMockHoverContext('workflow.awaitExecutions');
    await expect(handler.generateHoverContent(context)).resolves.toBeNull();
  });

  it('describes the step and its parameters', async () => {
    const stepContext = createMockStepContext({ stepType: 'workflow.awaitExecutions' });
    const context = createMockHoverContext('workflow.awaitExecutions', stepContext);
    const result = await handler.generateHoverContent(context);

    expect(result?.value).toContain('Wait for executions started by `workflow.executeAsync`');
    expect(result?.value).toContain('`from-steps`');
    expect(result?.value).toContain('`execution-ids`');
    expect(result?.value).toContain('`settled`');
    expect(result?.value).toContain('without cancelling the others');
    expect(result?.value).toContain('only the current iteration is awaited');
    expect(result?.value).toContain('Only executions started by this run');
    expect(result?.value).toContain('at most 24 hours');
    expect(result?.value).not.toContain('AI/ML');
  });
});
