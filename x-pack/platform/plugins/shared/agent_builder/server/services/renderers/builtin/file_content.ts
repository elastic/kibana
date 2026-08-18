/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RendererTypeDefinition } from '@kbn/agent-builder-server/renderers';
import {
  FILE_CONTENT_RENDERER_TYPE,
  fileContentPayloadSchema,
} from '../../../../common/renderers/file_content';

export const fileContentRendererDefinition: RendererTypeDefinition<
  typeof FILE_CONTENT_RENDERER_TYPE,
  typeof fileContentPayloadSchema
> = {
  type: FILE_CONTENT_RENDERER_TYPE,
  payloadSchema: fileContentPayloadSchema,
  getAgentDescription: () =>
    [
      'Renders the contents of an existing workspace file inline in the chat.',
      'The payload references the file by absolute workspace path:',
      '`{ "file_path": "/workspace/<path-to-file>" }`.',
      'Formatting is derived automatically from the file extension:',
      'Markdown (.md, .mdx) is rendered as rich text; JSON (.json, .jsonc) is pretty-printed;',
      'other recognized code extensions (ts, tsx, js, jsx, yaml, yml, sh, bash, py, html, css, xml, sql) render in a syntax-highlighted code block;',
      'anything else falls back to a plain code block.',
      'Only files under /workspace/ can be rendered.',
    ].join(' '),
};
