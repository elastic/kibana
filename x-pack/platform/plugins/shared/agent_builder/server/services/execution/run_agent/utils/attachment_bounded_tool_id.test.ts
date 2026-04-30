/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';
import {
  MAX_CONNECTOR_TOOL_NAME_LENGTH,
  attachmentScopedBoundedToolId,
} from './attachment_bounded_tool_id';

describe('attachmentScopedBoundedToolId', () => {
  it('keeps names within connector limits for UUID attachments and long bounded tool ids', () => {
    const attachmentId = '2a8fecc9-280b-43d9-9571-c9760549323e';
    const longTool = 'visualization_extract_full_configuration';
    const id = attachmentScopedBoundedToolId(attachmentId, longTool);
    expect(sanitizeToolId(id).length).toBeLessThanOrEqual(MAX_CONNECTOR_TOOL_NAME_LENGTH - 3);
  });

  it('produces distinct ids for different attachments with the same bounded tool id', () => {
    const a = attachmentScopedBoundedToolId('2a8fecc9-280b-43d9-9571-c9760549323e', 'same_tool');
    const b = attachmentScopedBoundedToolId('75dd1985-8073-407e-b732-5e6836e2059f', 'same_tool');
    expect(a).not.toBe(b);
  });

  it('uses a hash suffix when the combined id would exceed the limit', () => {
    const attachmentId = 'att-1';
    const hugeTool = 'x'.repeat(80);
    const id = attachmentScopedBoundedToolId(attachmentId, hugeTool);
    expect(sanitizeToolId(id).length).toBeLessThanOrEqual(MAX_CONNECTOR_TOOL_NAME_LENGTH);
    expect(id).toMatch(/^[a-f0-9]{12}_[a-f0-9]{16}$/);
  });
});
