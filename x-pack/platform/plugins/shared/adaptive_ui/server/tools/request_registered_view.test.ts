/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE, registeredViewIds } from '../../common/constants';
import { createAdaptiveUiViewRegistry } from '../registered_views';
import { requestRegisteredViewTool } from './request_registered_view';

type Handler = ReturnType<typeof requestRegisteredViewTool>['handler'];

const runContext = {
  runId: 'run-1',
  stack: [{ type: 'agent', agentId: 'a', conversationId: 'conv-1', executionId: 'exec-1' }],
};

const createContext = (add = jest.fn()) =>
  ({
    attachments: { add },
    logger: { debug: jest.fn(), error: jest.fn() },
    runContext,
  } as unknown as Parameters<Handler>[1]);

describe('requestRegisteredViewTool', () => {
  it('persists the curated spec as an attachment', async () => {
    const add = jest.fn().mockResolvedValue({ id: 'att-1', current_version: 1 });
    const tool = requestRegisteredViewTool({ registry: createAdaptiveUiViewRegistry() });

    const result = await tool.handler(
      { viewId: registeredViewIds.significantEvent },
      createContext(add)
    );

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ type: ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE }),
      ATTACHMENT_REF_ACTOR.agent
    );
    expect('results' in result && result.results[0]).toMatchObject({
      type: ToolResultType.other,
      data: { attachment_id: 'att-1', view_id: registeredViewIds.significantEvent },
    });
  });

  it('returns an error and does not persist when the view id is unknown', async () => {
    const add = jest.fn();
    const tool = requestRegisteredViewTool({ registry: createAdaptiveUiViewRegistry() });

    const result = await tool.handler({ viewId: 'does.not.exist' }, createContext(add));

    expect(add).not.toHaveBeenCalled();
    expect('results' in result && result.results[0].type).toBe(ToolResultType.error);
  });

  it('applies input overrides to the curated spec', async () => {
    const add = jest.fn().mockResolvedValue({ id: 'att-2', current_version: 1 });
    const tool = requestRegisteredViewTool({ registry: createAdaptiveUiViewRegistry() });

    const result = await tool.handler(
      { viewId: registeredViewIds.significantEvent, input: { title: 'Override' } },
      createContext(add)
    );

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: 'Override' }) }),
      ATTACHMENT_REF_ACTOR.agent
    );
    expect('results' in result && result.results[0].type).toBe(ToolResultType.other);
  });
});
