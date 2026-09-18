/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ToolAvailabilityConfig } from '@kbn/agent-builder-server/tools';
import { z } from '@kbn/zod/v4';
import type { SchemaService } from '../lib/schema_service';
import { runLiveQueryTool } from './run_live_query_tool';
import { buildToolContext, toolRequest } from './test_helpers';

jest.mock('../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn().mockResolvedValue({}),
}));

// Kibana's jest setup disallows generating code from strings, which zod v4's
// fastpass compiler needs for schemas with checks. `jitless` is captured when a
// schema is constructed, and the tool under test builds its schema at import
// time — so the config has to run first and the module is imported dynamically.
z.config({ jitless: true });

type GetLiveQueryResultsTool =
  typeof import('./get_live_query_results_tool').getLiveQueryResultsTool;

let getLiveQueryResultsTool: GetLiveQueryResultsTool;

beforeAll(async () => {
  ({ getLiveQueryResultsTool } = await import('./get_live_query_results_tool'));
});

const availabilityOf = (definition: { availability?: ToolAvailabilityConfig }) =>
  definition.availability!.handler({ request: toolRequest, spaceId: 'default' } as never);

describe('getLiveQueryResultsTool', () => {
  describe('action_id schema bound', () => {
    // github-actions review #4975398839: the id is free-form model input that
    // goes straight into term queries and echoed messages, so it needs a bound
    // like the other new string inputs.
    it('rejects an action_id longer than the bound', () => {
      const tool = getLiveQueryResultsTool(buildToolContext().context, loggerMock.create());

      expect(tool.schema.safeParse({ action_id: 'a'.repeat(129) }).success).toBe(false);
    });

    it('accepts an action_id at and below the bound', () => {
      const tool = getLiveQueryResultsTool(buildToolContext().context, loggerMock.create());

      expect(tool.schema.safeParse({ action_id: 'a'.repeat(128) }).success).toBe(true);
      expect(tool.schema.safeParse({ action_id: 'a'.repeat(36) }).success).toBe(true);
    });
  });

  describe('availability', () => {
    // github-actions review #4975398841: result retrieval is a READ of an action
    // that was already dispatched and space-checked. Gating it on current live
    // capability hides already-readable rows whenever the integration is removed,
    // an agent's status changes, or a Fleet lookup fails.
    it('stays available when the stack is no longer live-capable', async () => {
      const { context } = buildToolContext({ installVersion: undefined, agentsTotal: 0 });
      const result = await availabilityOf(getLiveQueryResultsTool(context, loggerMock.create()));

      expect(result.status).toBe('available');
    });

    it('does not consult Fleet capability to answer', async () => {
      const { context, getByIDs } = buildToolContext({
        installVersion: undefined,
        agentsTotal: 0,
      });

      await availabilityOf(getLiveQueryResultsTool(context, loggerMock.create()));

      expect(getByIDs).not.toHaveBeenCalled();
    });

    it('is unavailable when the Agent Builder tools flag is off', async () => {
      const { context } = buildToolContext();
      (
        context as unknown as { experimentalFeatures: { agentBuilderTools: boolean } }
      ).experimentalFeatures = { agentBuilderTools: false };

      const result = await availabilityOf(getLiveQueryResultsTool(context, loggerMock.create()));

      expect(result.status).toBe('unavailable');
    });

    it('leaves the write path capability-gated', async () => {
      // Only the read tool moved to flag-only availability: dispatch must stay
      // hidden until check_integration confirms a capable stack.
      const { context } = buildToolContext({ installVersion: undefined, agentsTotal: 0 });

      const readAvailability = await availabilityOf(
        getLiveQueryResultsTool(context, loggerMock.create())
      );
      const writeAvailability = await availabilityOf(
        runLiveQueryTool(context, loggerMock.create(), {} as unknown as SchemaService)
      );

      expect(readAvailability.status).toBe('available');
      expect(writeAvailability.status).toBe('unavailable');
    });
  });
});
