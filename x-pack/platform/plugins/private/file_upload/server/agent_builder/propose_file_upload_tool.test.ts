/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { FILE_UPLOAD_ATTACHMENT_TYPE } from '@kbn/file-upload-common';
import { createFileUploadAttachmentType } from './file_upload_attachment_type';
import { createProposeFileUploadTool } from './propose_file_upload_tool';

/** Wires the tool to the real attachment type, so tool input and `validate` cannot drift apart. */
const createTestContext = () => {
  const attachmentType = createFileUploadAttachmentType({
    getEsClient: async () => ({} as ElasticsearchClient),
    logger: loggerMock.create(),
  });
  const attachments = createAttachmentStateManager([], {
    getTypeDefinition: (type) =>
      type === FILE_UPLOAD_ATTACHMENT_TYPE
        ? (attachmentType as unknown as AttachmentTypeDefinition)
        : undefined,
  });
  return { context: { attachments } as unknown as ToolHandlerContext, attachments };
};

describe('propose_file_upload tool', () => {
  it('creates a file upload attachment and returns its id', async () => {
    const { context, attachments } = createTestContext();
    const tool = createProposeFileUploadTool();

    const result = (await tool.handler(
      { reason: 'Analyze your sales export', suggested_index_name: 'sales' },
      context
    )) as ToolHandlerStandardReturn;

    const [first] = result.results;
    expect(first.type).toBe(ToolResultType.other);
    const { attachment_id: attachmentId, version } = first.data as {
      attachment_id: string;
      version: number;
    };
    expect(version).toBe(1);

    const stored = attachments.get(attachmentId);
    expect(stored?.type).toBe(FILE_UPLOAD_ATTACHMENT_TYPE);
    expect(stored?.data.data).toEqual({
      reason: 'Analyze your sales export',
      suggested_index_name: 'sales',
    });
  });

  it('returns an error result when the attachment cannot be created', async () => {
    const tool = createProposeFileUploadTool();
    const context = {
      attachments: { add: jest.fn().mockRejectedValue(new Error('boom')) },
    } as unknown as ToolHandlerContext;

    const result = (await tool.handler({}, context)) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(JSON.stringify(result.results[0].data)).toContain('boom');
  });
});
