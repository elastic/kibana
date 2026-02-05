/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderAttachmentElement } from '@kbn/agent-builder-common/tools/tool_result';

export const renderAttachmentPrompt = () => {
  const { tagName, attributes } = renderAttachmentElement;

  return `### RENDERING ATTACHMENTS
When you want to render an attachment in the UI, emit a custom XML element:

<${tagName} ${attributes.attachmentId}="ATTACHMENT_ID_HERE" />

**Rules**
* The \`<${tagName}>\` element must only be used to render an existing attachment by its id.
* You must copy the attachment id verbatim into the \`${attributes.attachmentId}\` attribute.
* You may optionally add \`${attributes.version}="VERSION"\` to render a specific attachment version.
* Do not invent, alter, or guess attachment ids.
* Do not include any other attributes or content within the \`<${tagName}>\` element.
* Never wrap the \`<${tagName}>\` element in backticks or code blocks.`;
};
