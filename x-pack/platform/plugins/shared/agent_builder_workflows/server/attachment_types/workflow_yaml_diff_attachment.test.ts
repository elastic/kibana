/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerWorkflowYamlDiffAttachment } from './workflow_yaml_diff_attachment';
import { WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { SurfaceComposition } from '@kbn/agent-builder-server/attachments';
import { SURFACE_BASE_URL, renderSurface } from './test_utils';

interface RegisteredDiffType {
  id: string;
  validate: (input: unknown) => { valid: true; data: unknown } | { valid: false; error: string };
  format: (attachment: {
    data: {
      beforeYaml: string;
      afterYaml: string;
      proposalId: string;
      status: string;
    };
  }) => { getRepresentation: () => { type: 'text'; value: string } };
  getAgentDescription: () => string;
  toSurfaceComposition: (attachment: {
    data: {
      beforeYaml: string;
      afterYaml: string;
      proposalId: string;
      status: string;
      workflowId?: string;
      name?: string;
    };
  }) => SurfaceComposition;
}

const registerAndCapture = () => {
  let registeredType: RegisteredDiffType | undefined;
  const mockAgentBuilder = {
    attachments: {
      registerType: jest.fn((type: unknown) => {
        registeredType = type as RegisteredDiffType;
      }),
    },
  } as unknown as AgentBuilderPluginSetup;

  registerWorkflowYamlDiffAttachment(mockAgentBuilder);
  return registeredType!;
};

describe('workflow_yaml_diff_attachment', () => {
  describe('validate', () => {
    it('accepts valid diff data and defaults status to pending', () => {
      const type = registerAndCapture();
      const result = type.validate({
        beforeYaml: 'version: "1"',
        afterYaml: 'version: "1"\nname: Test',
        proposalId: 'p-1',
      });

      expect(result).toEqual({
        valid: true,
        data: {
          beforeYaml: 'version: "1"',
          afterYaml: 'version: "1"\nname: Test',
          proposalId: 'p-1',
          status: 'pending',
        },
      });
    });

    it('rejects input missing required fields', () => {
      const type = registerAndCapture();
      expect(type.validate({ beforeYaml: 'x' })).toMatchObject({ valid: false });
    });
  });

  describe('format', () => {
    it('produces a unified diff with proposal metadata', () => {
      const type = registerAndCapture();
      const { value } = type
        .format({
          data: {
            beforeYaml: 'version: "1"\nname: Old',
            afterYaml: 'version: "1"\nname: New',
            proposalId: 'p-42',
            status: 'pending',
          },
        })
        .getRepresentation();

      expect(value).toContain('Proposal ID: p-42');
      expect(value).toContain('Status: PENDING');
      expect(value).toContain('```diff');
      expect(value).toContain('-name: Old');
      expect(value).toContain('+name: New');
      expect(value).toContain(' version: "1"');
    });
  });

  describe('getAgentDescription', () => {
    it('references the diff attachment type', () => {
      const type = registerAndCapture();
      expect(type.getAgentDescription()).toContain(WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE);
    });
  });

  describe('toSurfaceComposition', () => {
    const beforeYaml = Array.from({ length: 20 }, (_, index) => `line${index + 1}: a`).join('\n');
    const afterYaml = beforeYaml.replace('line10: a', 'line10: b');

    it('renders only the changed hunks, with the status and a link to the workflow', async () => {
      const type = registerAndCapture();

      const composition = type.toSurfaceComposition({
        data: {
          beforeYaml,
          afterYaml,
          proposalId: 'p-1',
          status: 'pending',
          workflowId: 'workflow 1',
          name: 'Notify on-call',
        },
      });

      expect(composition.title).toBe('Notify on-call');
      expect(composition.subtitle).toBe('Proposed change · Pending');
      expect(composition.body[0]).toEqual({
        type: 'code',
        language: 'diff',
        text: [
          '@@ -7,7 +7,7 @@',
          ' line7: a',
          ' line8: a',
          ' line9: a',
          '-line10: a',
          '+line10: b',
          ' line11: a',
          ' line12: a',
          ' line13: a',
        ].join('\n'),
      });

      const { valid, errors, slack } = await renderSurface(composition);

      expect(errors).toEqual([]);
      expect(valid).toBe(true);
      expect(slack).toContain('+line10: b');
      expect(slack).not.toContain('line1: a');
      expect(slack).toContain(`${SURFACE_BASE_URL}/app/workflows/workflow%201`);
    });

    it('says there are no changes when the YAML is the same', async () => {
      const type = registerAndCapture();

      const composition = type.toSurfaceComposition({
        data: { beforeYaml, afterYaml: beforeYaml, proposalId: 'p-1', status: 'accepted' },
      });

      expect(composition.title).toBe('Workflow');
      expect(composition.subtitle).toBe('Proposed change · Accepted');
      expect(composition.body).toEqual([{ type: 'markdown', text: 'No changes.' }]);
      expect((await renderSurface(composition)).valid).toBe(true);
    });
  });
});
