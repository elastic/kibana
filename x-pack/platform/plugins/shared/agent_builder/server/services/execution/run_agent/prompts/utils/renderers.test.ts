/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { RendererTypeDefinition } from '@kbn/agent-builder-server/renderers';
import { renderRenderersPrompt } from './renderers';

const tableRenderer: RendererTypeDefinition = {
  type: 'table',
  payloadSchema: z.object({
    columns: z.array(z.string()),
    rows: z.array(z.record(z.string(), z.unknown())),
  }),
  getAgentDescription: () => 'Renders a dataset as an interactive table.',
};

describe('renderRenderersPrompt', () => {
  const prompt = renderRenderersPrompt([tableRenderer]);

  it('documents the <render> directive with path and type attributes', () => {
    expect(prompt).toContain('<render');
    expect(prompt).toContain('path=');
    expect(prompt).toContain('type=');
  });

  it('documents the workspace path convention and self-describing envelope', () => {
    expect(prompt).toContain('/workspace/renders/');
    expect(prompt).toContain('"type"');
    expect(prompt).toContain('"data"');
  });

  it('advertises each registered type, its description, and its data schema', () => {
    expect(prompt).toContain('table');
    expect(prompt).toContain('Renders a dataset as an interactive table.');
    // The full (nested) JSON schema is included so the agent knows the field shapes.
    expect(prompt).toContain('columns');
    expect(prompt).toContain('rows');
  });
});
