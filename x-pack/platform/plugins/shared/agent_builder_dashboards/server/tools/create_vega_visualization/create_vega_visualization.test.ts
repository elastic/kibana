/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { ToolResultType, type ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { VEGA_VISUALIZATION_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { createVegaVisualizationTool } from './create_vega_visualization';
import { CREATE_VEGA_VISUALIZATION_FAILURE_TYPES } from './failure_types';

interface StandardToolReturn {
  results: ToolResult[];
}

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const createMockAttachmentsManager = (
  overrides: Partial<AttachmentStateManager> = {}
): AttachmentStateManager =>
  ({
    add: jest.fn(),
    ...overrides,
  } as unknown as AttachmentStateManager);

const validVegaLiteSpec = JSON.stringify({
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  mark: 'bar',
  encoding: {
    x: { field: 'category', type: 'nominal' },
    y: { field: 'count', type: 'quantitative' },
  },
  data: { url: { '%type%': 'esql', query: 'FROM logs-* | STATS count = COUNT() BY category' } },
});

const validVegaSpec = JSON.stringify({
  $schema: 'https://vega.github.io/schema/vega/v6.json',
  marks: [],
});

const callHandler = async ({
  title,
  spec,
  attachmentsManager = createMockAttachmentsManager({
    add: jest.fn().mockResolvedValue({
      id: 'new-attachment-id',
      current_version: 1,
    }) as unknown as AttachmentStateManager['add'],
  }),
}: {
  title: string;
  spec: string;
  attachmentsManager?: AttachmentStateManager;
}) => {
  const tool = createVegaVisualizationTool();
  const result = (await tool.handler({ title, spec }, {
    logger: createMockLogger(),
    attachments: attachmentsManager,
  } as never)) as StandardToolReturn;
  return { result, attachmentsManager };
};

describe('createVegaVisualizationTool', () => {
  it('returns a persistence-backed result for a valid Vega-Lite spec', async () => {
    const { result, attachmentsManager } = await callHandler({
      title: 'Counts by category',
      spec: validVegaLiteSpec,
    });

    expect(result.results).toHaveLength(1);
    const [tr] = result.results;
    expect(tr.type).toBe(ToolResultType.other);
    expect(tr.data).toEqual(
      expect.objectContaining({
        attachment_id: 'new-attachment-id',
        title: 'Counts by category',
        dialect: 'vega-lite',
      })
    );
    expect(attachmentsManager.add).toHaveBeenCalledTimes(1);
    expect(attachmentsManager.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: VEGA_VISUALIZATION_ATTACHMENT_TYPE,
        data: expect.objectContaining({ title: 'Counts by category', dialect: 'vega-lite' }),
      })
    );
  });

  it('detects full Vega specs from the $schema URL', async () => {
    const { result } = await callHandler({ title: 'Custom Vega', spec: validVegaSpec });
    const [tr] = result.results;
    expect(tr.type).toBe(ToolResultType.other);
    expect(tr.data).toEqual(expect.objectContaining({ dialect: 'vega' }));
  });

  it('returns an invalid_json error for malformed JSON', async () => {
    const { result } = await callHandler({ title: 't', spec: '{ this is not valid json' });
    expect(result.results[0]).toEqual(
      expect.objectContaining({
        type: ToolResultType.error,
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            failure_type: CREATE_VEGA_VISUALIZATION_FAILURE_TYPES.invalidJson,
          }),
        }),
      })
    );
  });

  it('returns a missing_schema error when $schema is absent', async () => {
    const { result } = await callHandler({
      title: 't',
      spec: JSON.stringify({ mark: 'bar' }),
    });
    expect(result.results[0]).toEqual(
      expect.objectContaining({
        type: ToolResultType.error,
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            failure_type: CREATE_VEGA_VISUALIZATION_FAILURE_TYPES.missingSchema,
          }),
        }),
      })
    );
  });

  it('returns a missing_schema error for unknown $schema URLs', async () => {
    const { result } = await callHandler({
      title: 't',
      spec: JSON.stringify({ $schema: 'https://example.com/schema.json', mark: 'bar' }),
    });
    expect(result.results[0]).toEqual(
      expect.objectContaining({
        type: ToolResultType.error,
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            failure_type: CREATE_VEGA_VISUALIZATION_FAILURE_TYPES.missingSchema,
          }),
        }),
      })
    );
  });

  it('returns a persistence error when the attachment manager rejects', async () => {
    const attachmentsManager = createMockAttachmentsManager({
      add: jest
        .fn()
        .mockRejectedValue(new Error('disk full')) as unknown as AttachmentStateManager['add'],
    });
    const { result } = await callHandler({
      title: 't',
      spec: validVegaLiteSpec,
      attachmentsManager,
    });
    expect(result.results[0]).toEqual(
      expect.objectContaining({
        type: ToolResultType.error,
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            failure_type: CREATE_VEGA_VISUALIZATION_FAILURE_TYPES.persistence,
          }),
        }),
      })
    );
  });
});
