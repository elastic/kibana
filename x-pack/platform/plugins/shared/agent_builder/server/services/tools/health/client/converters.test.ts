/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromEs } from './converters';
import type { ToolHealthDocument } from './types';

const testDate = '2024-12-12T10:00:00.000Z';

describe('fromEs', () => {
  it('converts a healthy document to ToolHealthState', () => {
    const document: ToolHealthDocument = {
      _id: 'default:my-tool',
      _index: '.chat-tool-health',
      _source: {
        tool_id: 'my-tool',
        space: 'default',
        status: 'healthy',
        last_check: testDate,
        error_message: '',
        consecutive_failures: 0,
        updated_at: testDate,
      },
    };

    const state = fromEs(document);

    expect(state).toEqual({
      toolId: 'my-tool',
      status: 'healthy',
      lastCheck: testDate,
      errorMessage: undefined, // Empty string converts to undefined
      consecutiveFailures: 0,
    });
  });

  it('converts a failed document with error message', () => {
    const document: ToolHealthDocument = {
      _id: 'default:mcp-github-tool',
      _index: '.chat-tool-health',
      _source: {
        tool_id: 'mcp-github-tool',
        space: 'default',
        status: 'failed',
        last_check: testDate,
        error_message: 'MCP connector not found',
        consecutive_failures: 5,
        updated_at: testDate,
      },
    };

    const state = fromEs(document);

    expect(state).toEqual({
      toolId: 'mcp-github-tool',
      status: 'failed',
      lastCheck: testDate,
      errorMessage: 'MCP connector not found', // Preserved when present
      consecutiveFailures: 5,
    });
  });

  it('handles unknown status', () => {
    const document: ToolHealthDocument = {
      _id: 'default:new-tool',
      _index: '.chat-tool-health',
      _source: {
        tool_id: 'new-tool',
        space: 'default',
        status: 'unknown',
        last_check: testDate,
        error_message: '',
        consecutive_failures: 0,
        updated_at: testDate,
      },
    };

    const state = fromEs(document);

    expect(state.status).toBe('unknown');
  });
});
