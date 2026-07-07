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
  it('returns an empty string when bash is disabled', () => {
    expect(renderRenderersPrompt([tableRenderer], { bashEnabled: false })).toBe('');
  });

  it('returns an empty string when no renderers are registered', () => {
    expect(renderRenderersPrompt([], { bashEnabled: true })).toBe('');
  });

  describe('with a registered renderer', () => {
    const prompt = renderRenderersPrompt([tableRenderer], { bashEnabled: true });

    it('documents the <render> directive and requires both attributes', () => {
      expect(prompt).toContain('<render');
      expect(prompt).toContain('path=');
      expect(prompt).toContain('type=');
      expect(prompt).toContain('REQUIRED');
    });

    it('recommends (not mandates) the workspace path convention', () => {
      expect(prompt).toContain('recommended location');
      expect(prompt).toContain('/workspace/renders/');
    });

    it('describes the file content as the raw payload', () => {
      expect(prompt).toContain('The file content is the payload itself');
      expect(prompt).not.toContain('envelope');
    });

    it('instructs the agent to write the file with bash before emitting', () => {
      expect(prompt).toContain('bash tool');
      expect(prompt).toContain('BEFORE emitting the directive');
    });

    it('advertises each registered type, its description, and its payload schema', () => {
      expect(prompt).toContain('#### type: "table"');
      expect(prompt).toContain('Renders a dataset as an interactive table.');
      expect(prompt).toContain('columns');
      expect(prompt).toContain('rows');
    });
  });
});
