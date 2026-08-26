/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { RendererTypeDefinition } from '@kbn/agent-builder-server/renderers';
import { renderElement } from '@kbn/agent-builder-common/tools/custom_rendering';
import { MOUNT_POINTS } from '../../../filesystem/mount_points';

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

export interface RenderRenderersPromptOptions {
  /** Whether the bash tool is enabled for this run — render files can only be authored via bash. */
  bashEnabled: boolean;
}

/**
 * Exposes the registered renderers to the agent: the `<render>` directive, the
 * recommended workspace file convention, and each type's payload JSON schema.
 * Returns an empty string when bash is disabled or no renderers are registered,
 * so callers can interpolate unconditionally.
 */
export const renderRenderersPrompt = (
  renderers: RendererTypeDefinition[],
  { bashEnabled }: RenderRenderersPromptOptions
): string => {
  if (!bashEnabled || renderers.length === 0) {
    return '';
  }

  const { tagName, attributes } = renderElement;
  const rendersDir = `${MOUNT_POINTS.workspace}/renders`;

  const typeSections = renderers
    .map((renderer) => {
      const description = renderer.getAgentDescription?.();
      return [
        `#### type: "${renderer.type}"`,
        ...(description ? [description] : []),
        `Payload JSON schema: ${describePayloadSchema(renderer)}`,
      ].join('\n');
    })
    .join('\n\n');

  const exampleType = renderers[0].type;

  return `### RENDERING OBJECTS
You can render a rich object inline in your reply by writing its data to a workspace file and emitting a <${tagName}> directive that points at the file.

**How to render**
1. Pick a render type from the list below.
2. Use the bash tool to write the payload to a workspace file. The file content is the payload itself, matching the type's schema exactly. The recommended location is \`${rendersDir}/{type}/{id}.json\` with a short descriptive {id}. Use a NEW filename whenever you create or change a render (never overwrite an existing file, so earlier replies keep their original render).
3. Emit the directive on its own line (never inside a code block). Both attributes are REQUIRED — \`${attributes.type}\` selects the renderer:
   \`<${tagName} ${attributes.path}="${rendersDir}/{type}/{id}.json" ${attributes.type}="<render type>" />\`

**Rules**
* Only use a \`${attributes.type}\` from the list below; the file content must match that type's schema exactly.
* Always write the file with bash BEFORE emitting the directive, and copy the path verbatim.

**Example**
Write the payload to \`${rendersDir}/${exampleType}/example.json\`, then reply with:
\`<${tagName} ${attributes.path}="${rendersDir}/${exampleType}/example.json" ${attributes.type}="${exampleType}" />\`

**Available render types**
${typeSections}`;
};
