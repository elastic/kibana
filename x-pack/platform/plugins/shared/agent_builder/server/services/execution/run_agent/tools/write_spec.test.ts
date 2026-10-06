/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalTools, ToolResultType } from '@kbn/agent-builder-common';
import { isInternalTool } from '@kbn/agent-builder-common/tools';
import { createToolHandlerContextMock } from '../../../../test_utils/runner';
import { createWriteSpecTool } from './write_spec';

const callHandler = (spec: Record<string, unknown>) =>
  createWriteSpecTool().handler({ spec }, createToolHandlerContextMock()) as Promise<{
    results: Array<{ type: ToolResultType; data: Record<string, unknown> }>;
  }>;

describe('write_spec tool', () => {
  it('is an internal tool', () => {
    expect(createWriteSpecTool().id).toBe(internalTools.writeSpec);
    expect(isInternalTool(internalTools.writeSpec)).toBe(true);
  });

  it('accepts a valid spec without echoing it', async () => {
    const { results } = await callHandler({
      type: 'view',
      body: [{ type: 'markdown', text: 'There are **3** open alerts.' }],
    });

    expect(results).toEqual([
      expect.objectContaining({ type: ToolResultType.other, data: { accepted: true } }),
    ]);
  });

  it('rejects an invalid spec with the paths of the errors', async () => {
    const { results } = await callHandler({
      type: 'view',
      body: [{ type: 'markdown', text: 'Hi', color: 'red' }],
    });

    expect(results).toEqual([
      expect.objectContaining({
        type: ToolResultType.error,
        data: expect.objectContaining({
          message: expect.stringContaining('body[0]'),
          metadata: { errors: [expect.stringContaining('color')] },
        }),
      }),
    ]);
  });
});
