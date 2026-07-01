/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { RendererTypeDefinition } from '@kbn/agent-builder-server/renderers';
import { renderElement } from '@kbn/agent-builder-common/tools/custom_rendering';

const describePayloadSchema = (renderer: RendererTypeDefinition): string => {
  try {
    const { $schema, ...jsonSchema } = z.toJSONSchema(renderer.payloadSchema, {
      unrepresentable: 'any',
      io: 'input',
    }) as Record<string, unknown>;
    return JSON.stringify(jsonSchema);
  } catch {
    return '{}';
  }
};

export const renderRenderersPrompt = (renderers: RendererTypeDefinition[]): string => {
  const { tagName, attributes } = renderElement;

  const typeSections = renderers
    .map((renderer) => {
      const description = renderer.getAgentDescription?.();
      return [
        `#### type: "${renderer.type}"`,
        ...(description ? [description] : []),
        `\`data\` JSON schema: ${describePayloadSchema(renderer)}`,
      ].join('\n');
    })
    .join('\n\n');

  const exampleType = renderers[0].type;

  return `### RENDERING OBJECTS
You can render a rich object inline in your reply by writing its data to a workspace file and emitting a <${tagName}> directive that points at the file.

**How to render**
1. Pick a render type from the list below.
2. Use the bash tool to write a JSON file to \`/workspace/renders/{type}/{id}.json\` — choose a short descriptive {id}, and use a NEW filename whenever you create or change a render (never overwrite an existing file, so earlier replies keep their original render).
3. The file MUST be a self-describing envelope:
   \`{ "type": "<render type>", "data": <object matching that type's data schema> }\`
4. Emit the directive on its own line (never inside a code block), always including the \`${attributes.type}\`:
   \`<${tagName} ${attributes.path}="/workspace/renders/{type}/{id}.json" ${attributes.type}="<render type>" />\`

**Rules**
* Only use a \`${attributes.type}\` from the list below; \`data\` must match that type's schema exactly.
* Always write the file with bash BEFORE emitting the directive, and copy the path verbatim.

**Example**
Write \`/workspace/renders/${exampleType}/example.json\`, then reply with:
\`<${tagName} ${attributes.path}="/workspace/renders/${exampleType}/example.json" ${attributes.type}="${exampleType}" />\`

**Available render types**
${typeSections}`;
};
