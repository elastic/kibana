/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { FILE_UPLOAD_SKILL_ID } from '@kbn/file-upload-common';
import {
  createProposeFileUploadTool,
  PROPOSE_FILE_UPLOAD_TOOL_ID,
} from './propose_file_upload_tool';

export const createFileUploadSkill = () =>
  defineSkillType({
    id: FILE_UPLOAD_SKILL_ID,
    name: 'file-upload',
    basePath: 'skills/platform/file-upload',
    description:
      'Let the user upload a file (CSV, TSV, NDJSON, log files, PDF, Word and other documents) into a new Elasticsearch index from chat. Use when the user wants to upload, import, or ingest a file, or has data in a local file that they want analyzed, searched, or visualized.',
    content: dedent(`
## When to Use This Skill

Use this skill when:
- The user asks to upload, import, or ingest a file into Elasticsearch.
- The user has data in a local file (spreadsheet export, CSV, log file, document) and wants you to analyze, search, or visualize it.

Do **not** use this skill when:
- The data is already in Elasticsearch — query it directly.
- The user wants to set up continuous ingestion (agents, integrations, connectors) — this card is for one-off file uploads.

## Available Tools

- **${PROPOSE_FILE_UPLOAD_TOOL_ID}** — Render an inline file upload card. Returns an \`attachment_id\` for \`<render_attachment>\`.

## Workflow

1. **Render the card.** Call \`${PROPOSE_FILE_UPLOAD_TOOL_ID}\`, optionally with a one-line \`reason\` and a \`suggested_index_name\` (lowercase, no spaces). On success, emit \`<render_attachment id="ATTACHMENT_ID" />\` **on its own line** (with a blank line before it). Keep your prose short and ask the user to click "Upload file".

2. **Never ask for file contents in chat.** The file is analyzed and imported by the upload UI. Do not ask the user to paste data into the conversation.

3. **Continue after upload.** You are not notified when the upload finishes. On the user's next message, the attachment content names the index, its document count and its fields. If it says no file has been uploaded yet, ask the user to finish the upload. Once uploaded, use your search and ES|QL tools against that index.
  `),
    getInlineTools: () => [createProposeFileUploadTool()],
  });
