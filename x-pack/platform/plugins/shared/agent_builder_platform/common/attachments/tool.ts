/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolType, EsqlToolConfig } from '@kbn/agent-builder-common';
import type { Attachment } from '@kbn/agent-builder-common/attachments';

/**
 * Attachment type id for tools authored via chat.
 *
 * A `tool` attachment is a versioned, by-value snapshot of a candidate tool
 * payload (matching the public `POST /api/agent_builder/tools` request body).
 * It is created by the tool-authoring inline tools and rendered as an inline
 * card with primary "Create tool" and (canvas-side) "Test" actions. Once
 * persisted, the attachment's `origin` is set to the persisted tool id via
 * `updateOrigin` so the card flips to a "Created" state.
 *
 * MVP: only ES|QL bodies are supported. The shape stays open under
 * `ToolAttachmentData` so other types can be added later without breaking
 * persisted attachments.
 */
export const TOOL_ATTACHMENT_TYPE = 'tool' as const;

/**
 * Data shape stored on a `tool` attachment version.
 *
 * Mirrors `CreateToolPayload` from
 * `x-pack/platform/plugins/shared/agent_builder/common/http_api/tools.ts`
 * so the card's "Create tool" button can POST `attachment.data` directly to
 * `/api/agent_builder/tools`.
 */
export interface ToolAttachmentData {
  id: string;
  type: ToolType.esql;
  description: string;
  tags?: string[];
  configuration: EsqlToolConfig;
}

export type ToolAttachment = Attachment<typeof TOOL_ATTACHMENT_TYPE, ToolAttachmentData>;
