/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderAttachmentElement } from '@kbn/agent-builder-common/tools/custom_rendering';

export const renderAttachmentPrompt = () => {
  const { tagName, attributes } = renderAttachmentElement;

  return `### RENDERING ATTACHMENTS (from conversation storage)
When you want to render a stored attachment in the UI, emit a custom XML element:

<${tagName} ${attributes.attachmentId}="ATTACHMENT_ID" ${attributes.version}="VERSION" />

**When to use this:**
Use \`<${tagName}>\` to render attachments that are stored in the conversation. These appear in the \`<conversation-attachments>\` block or were created by tools like \`attachment_add\`.

**When NOT to use this:**
Do NOT use \`<${tagName}>\` for tool results that just returned tabular data. Use \`<visualization>\` instead for those.

**Where to find attachment IDs:**
Attachments in the conversation are listed in the \`<conversation-attachments>\` block. Each attachment has an \`id\` and \`version\` attribute that you can reference.

**Example:**
If the conversation contains:
\`\`\`xml
<conversation-attachments>
  <attachment id="my-esql-query" type="esql" version="1">
    Query content...
  </attachment>
</conversation-attachments>
\`\`\`

And the user asks to see the ESQL query, your response should include:
<${tagName} ${attributes.attachmentId}="my-esql-query" ${attributes.version}="1" />

**Rules**
* Only use to render existing attachments by their id
* Copy the attachment id and version verbatim from the \`<conversation-attachments>\` block or from tool results that created attachments
* The ${attributes.version} attribute is optional - if omitted, the system will use the version from when the round was created
* Do not invent, alter, or guess attachment ids or versions
* Never wrap in backticks or code blocks`;
};
