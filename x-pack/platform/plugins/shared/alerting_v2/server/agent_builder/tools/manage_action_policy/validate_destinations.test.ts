/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { ActionPolicyOperationValidationError } from './operations';
import { validateDestinations } from './validate_destinations';

const YAML_MANUAL_TRIGGER_NO_PAYLOAD_REF = `
name: notify
triggers:
  - type: manual
`;

const YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF = `
name: notify
triggers:
  - type: manual
    inputs:
      properties:
        payload:
          $ref: '#/kibana/definitions/alertingV2NotificationGroup'
`;

const YAML_MANUAL_TRIGGER_WITH_UNRELATED_PAYLOAD = `
name: notify
triggers:
  - type: manual
    inputs:
      properties:
        payload:
          type: object
`;

const YAML_MANUAL_TRIGGER_WITH_WRONG_REF = `
name: notify
triggers:
  - type: manual
    inputs:
      properties:
        payload:
          $ref: '#/kibana/definitions/someOtherSchema'
`;

const YAML_ALERT_TRIGGER_ONLY = `
name: notify
triggers:
  - type: alert
`;

const YAML_NO_TRIGGERS = `
name: notify
steps: []
`;

const YAML_TRIGGERS_NOT_A_LIST = `
name: notify
triggers: manual
`;

const createMockAttachments = (
  active: Array<{
    id: string;
    type: string;
    versions: Array<{ data: Record<string, unknown> }>;
  }> = []
): AttachmentStateManager =>
  ({
    getActive: jest.fn().mockReturnValue(active),
  } as unknown as AttachmentStateManager);

const createMockWorkflowLookup = (
  workflows: Map<string, { id: string; name?: string; yaml?: string }> = new Map()
) => ({
  getWorkflow: jest.fn(async (id: string) => workflows.get(id) ?? null),
});

const createMockConnectorLookup = (
  connectors: Map<string, { id: string; name: string }> = new Map()
) => ({
  findConnectorById: jest.fn(async (id: string) => connectors.get(id) ?? null),
});

const mockRequest = {} as import('@kbn/core/server').KibanaRequest;

describe('validateDestinations', () => {
  it('rejects bare attachment IDs and instructs to use workflowId', async () => {
    const attachments = createMockAttachments([
      {
        id: 'att-workflow-1',
        type: WORKFLOW_YAML_ATTACHMENT_TYPE,
        versions: [{ data: { yaml: 'version: 1', workflowId: 'wf-saved-1' } }],
      },
    ]);

    await expect(
      validateDestinations([{ type: 'workflow', id: 'att-workflow-1' }], {
        attachments,
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      })
    ).rejects.toThrow(ActionPolicyOperationValidationError);

    await expect(
      validateDestinations([{ type: 'workflow', id: 'att-workflow-1' }], {
        attachments,
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      })
    ).rejects.toThrow(/is a workflow attachment ID, not a workflow ID/);
  });

  it('passes when destination matches an in-memory workflow attachment by workflowId', async () => {
    const attachments = createMockAttachments([
      {
        id: 'att-workflow-1',
        type: WORKFLOW_YAML_ATTACHMENT_TYPE,
        versions: [
          { data: { yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF, workflowId: 'wf-saved-1' } },
        ],
      },
    ]);

    await expect(
      validateDestinations([{ type: 'workflow', id: 'wf-saved-1' }], {
        attachments,
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      })
    ).resolves.toEqual({ diagnostics: [] });
  });

  it('passes when destination matches a persisted workflow', async () => {
    const workflowLookup = createMockWorkflowLookup(
      new Map([['persisted-wf-1', { id: 'persisted-wf-1' }]])
    );

    await expect(
      validateDestinations([{ type: 'workflow', id: 'persisted-wf-1' }], {
        attachments: createMockAttachments(),
        workflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      })
    ).resolves.toEqual({ diagnostics: [] });

    expect(workflowLookup.getWorkflow).toHaveBeenCalledWith('persisted-wf-1', 'default');
  });

  it('throws a specific error when the destination ID is a connector', async () => {
    const connectorLookup = createMockConnectorLookup(
      new Map([['conn-email-1', { id: 'conn-email-1', name: 'SRE On-Call Alerts' }]])
    );

    await expect(
      validateDestinations([{ type: 'workflow', id: 'conn-email-1' }], {
        attachments: createMockAttachments(),
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup,
        spaceId: 'default',
      })
    ).rejects.toThrow(ActionPolicyOperationValidationError);

    await expect(
      validateDestinations([{ type: 'workflow', id: 'conn-email-1' }], {
        attachments: createMockAttachments(),
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup,
        spaceId: 'default',
      })
    ).rejects.toThrow(/is a connector \("SRE On-Call Alerts"\), not a workflow/);
  });

  it('throws a generic error when the destination ID is unknown', async () => {
    await expect(
      validateDestinations([{ type: 'workflow', id: 'unknown-id-123' }], {
        attachments: createMockAttachments(),
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      })
    ).rejects.toThrow(ActionPolicyOperationValidationError);

    await expect(
      validateDestinations([{ type: 'workflow', id: 'unknown-id-123' }], {
        attachments: createMockAttachments(),
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      })
    ).rejects.toThrow(/is not a valid workflow in this space or conversation/);
  });

  it('skips persisted and connector lookups when workflowId matches', async () => {
    const attachments = createMockAttachments([
      {
        id: 'att-wf',
        type: WORKFLOW_YAML_ATTACHMENT_TYPE,
        versions: [
          {
            data: {
              yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF,
              workflowId: 'notify-high-cpu',
              name: 'High CPU',
            },
          },
        ],
      },
    ]);
    const workflowLookup = createMockWorkflowLookup();
    const connectorLookup = createMockConnectorLookup();

    await validateDestinations([{ type: 'workflow', id: 'notify-high-cpu' }], {
      attachments,
      workflowLookup,
      connectorLookup,
      spaceId: 'default',
    });

    expect(workflowLookup.getWorkflow).not.toHaveBeenCalled();
    expect(connectorLookup.findConnectorById).not.toHaveBeenCalled();
  });

  it('skips connector lookup when persisted workflow matches', async () => {
    const workflowLookup = createMockWorkflowLookup(new Map([['wf-1', { id: 'wf-1' }]]));
    const connectorLookup = createMockConnectorLookup();

    await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
      attachments: createMockAttachments(),
      workflowLookup,
      connectorLookup,
      spaceId: 'default',
    });

    expect(connectorLookup.findConnectorById).not.toHaveBeenCalled();
  });

  it('validates multiple destinations and fails on the first invalid one', async () => {
    const attachments = createMockAttachments([
      {
        id: 'att-wf-ok',
        type: WORKFLOW_YAML_ATTACHMENT_TYPE,
        versions: [
          {
            data: {
              yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF,
              workflowId: 'notify-ok',
              name: 'OK',
            },
          },
        ],
      },
    ]);

    await expect(
      validateDestinations(
        [
          { type: 'workflow', id: 'notify-ok' },
          { type: 'workflow', id: 'bad-id' },
        ],
        {
          attachments,
          workflowLookup: createMockWorkflowLookup(),
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        }
      )
    ).rejects.toThrow(/bad-id/);
  });

  it('ignores non-workflow attachments when scanning for matches', async () => {
    const attachments = createMockAttachments([
      {
        id: 'some-connector-att',
        type: 'connector',
        versions: [{ data: { connectorId: 'some-id' } }],
      },
    ]);

    await expect(
      validateDestinations([{ type: 'workflow', id: 'some-connector-att' }], {
        attachments,
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      })
    ).rejects.toThrow(/is not a valid workflow/);
  });

  describe('structural checks — manual trigger', () => {
    it('throws when an in-memory attachment workflow has no manual trigger (alert trigger only)', async () => {
      const attachments = createMockAttachments([
        {
          id: 'att-wf',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [{ data: { yaml: YAML_ALERT_TRIGGER_ONLY, workflowId: 'wf-alert-only' } }],
        },
      ]);

      await expect(
        validateDestinations([{ type: 'workflow', id: 'wf-alert-only' }], {
          attachments,
          workflowLookup: createMockWorkflowLookup(),
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        })
      ).rejects.toThrow(/does not have a "manual" trigger/);
    });

    it('throws when an in-memory attachment workflow declares no triggers at all', async () => {
      const attachments = createMockAttachments([
        {
          id: 'att-wf',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [{ data: { yaml: YAML_NO_TRIGGERS, workflowId: 'wf-no-triggers' } }],
        },
      ]);

      await expect(
        validateDestinations([{ type: 'workflow', id: 'wf-no-triggers' }], {
          attachments,
          workflowLookup: createMockWorkflowLookup(),
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        })
      ).rejects.toThrow(ActionPolicyOperationValidationError);
    });

    it('throws when the workflow YAML has a malformed triggers field (not a list)', async () => {
      const attachments = createMockAttachments([
        {
          id: 'att-wf',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [{ data: { yaml: YAML_TRIGGERS_NOT_A_LIST, workflowId: 'wf-broken-yaml' } }],
        },
      ]);

      await expect(
        validateDestinations([{ type: 'workflow', id: 'wf-broken-yaml' }], {
          attachments,
          workflowLookup: createMockWorkflowLookup(),
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        })
      ).rejects.toThrow(/does not have a "manual" trigger/);
    });

    it('throws when a persisted workflow has no manual trigger', async () => {
      const workflowLookup = createMockWorkflowLookup(
        new Map([['wf-alert-only', { id: 'wf-alert-only', yaml: YAML_ALERT_TRIGGER_ONLY }]])
      );

      await expect(
        validateDestinations([{ type: 'workflow', id: 'wf-alert-only' }], {
          attachments: createMockAttachments(),
          workflowLookup,
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        })
      ).rejects.toThrow(/does not have a "manual" trigger/);
    });

    it('does not throw when a persisted workflow has no yaml available (nothing to check)', async () => {
      const workflowLookup = createMockWorkflowLookup(
        new Map([['wf-no-yaml', { id: 'wf-no-yaml' }]])
      );

      await expect(
        validateDestinations([{ type: 'workflow', id: 'wf-no-yaml' }], {
          attachments: createMockAttachments(),
          workflowLookup,
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        })
      ).resolves.toEqual({ diagnostics: [] });
    });
  });

  describe('structural checks — inputs.payload ref', () => {
    it('returns a warning diagnostic when the manual trigger declares no inputs at all', async () => {
      const workflowLookup = createMockWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_NO_PAYLOAD_REF }]])
      );

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
        attachments: createMockAttachments(),
        workflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      });

      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          destinationId: 'wf-1',
          severity: 'warning',
          source: 'structural',
          message: expect.stringContaining('does not declare `inputs.payload`'),
        }),
      ]);
    });

    it('returns a warning diagnostic when inputs.payload is declared without a $ref', async () => {
      const workflowLookup = createMockWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_WITH_UNRELATED_PAYLOAD }]])
      );

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
        attachments: createMockAttachments(),
        workflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      });

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0].source).toBe('structural');
    });

    it('returns a warning diagnostic when inputs.payload $ref points at an unrelated/unresolvable definition', async () => {
      const workflowLookup = createMockWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_WITH_WRONG_REF }]])
      );

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
        attachments: createMockAttachments(),
        workflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      });

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0].source).toBe('structural');
    });

    it('returns no diagnostics when inputs.payload correctly references alertingV2NotificationGroup', async () => {
      const workflowLookup = createMockWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF }]])
      );

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
        attachments: createMockAttachments(),
        workflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      });

      expect(result.diagnostics).toEqual([]);
    });
  });

  describe('workflow validation service (variable refs)', () => {
    it('calls validateWorkflow with the resolved yaml and surfaces error diagnostics as warnings', async () => {
      const workflowLookup = createMockWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF }]])
      );
      const validateWorkflow = jest.fn().mockResolvedValue({
        valid: false,
        diagnostics: [
          {
            severity: 'error',
            ruleId: 'invalidVariablePath',
            message: 'Unknown path "episodez" on `inputs.payload`',
            source: 'variables',
            path: ['steps', 0, 'with', 'message'],
          },
        ],
      });

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
        attachments: createMockAttachments(),
        workflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
        validateWorkflow,
        request: mockRequest,
      });

      expect(validateWorkflow).toHaveBeenCalledWith(
        YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF,
        'default',
        mockRequest
      );
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          destinationId: 'wf-1',
          severity: 'warning',
          source: 'workflow-validation',
          message: expect.stringContaining('invalidVariablePath'),
        }),
      ]);
      expect(result.diagnostics[0].message).toContain('episodez');
    });

    it('ignores non-error diagnostics returned by validateWorkflow', async () => {
      const workflowLookup = createMockWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF }]])
      );
      const validateWorkflow = jest.fn().mockResolvedValue({
        valid: true,
        diagnostics: [
          {
            severity: 'warning',
            ruleId: 'unknownVariableType',
            message: 'Could not statically determine the type',
            source: 'variables',
          },
        ],
      });

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
        attachments: createMockAttachments(),
        workflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
        validateWorkflow,
        request: mockRequest,
      });

      expect(result.diagnostics).toEqual([]);
    });

    it('does not call validateWorkflow when it is not provided', async () => {
      const workflowLookup = createMockWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF }]])
      );

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
        attachments: createMockAttachments(),
        workflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      });

      expect(result.diagnostics).toEqual([]);
    });

    it('does not call validateWorkflow when request is not provided', async () => {
      const workflowLookup = createMockWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF }]])
      );
      const validateWorkflow = jest.fn().mockResolvedValue({ valid: true, diagnostics: [] });

      await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
        attachments: createMockAttachments(),
        workflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
        validateWorkflow,
      });

      expect(validateWorkflow).not.toHaveBeenCalled();
    });

    it('does not throw and does not add diagnostics when validateWorkflow rejects', async () => {
      const workflowLookup = createMockWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF }]])
      );
      const validateWorkflow = jest.fn().mockRejectedValue(new Error('service unavailable'));

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
        attachments: createMockAttachments(),
        workflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
        validateWorkflow,
        request: mockRequest,
      });

      expect(result.diagnostics).toEqual([]);
    });

    it('combines structural and workflow-validation diagnostics for a doubly-invalid workflow', async () => {
      const workflowLookup = createMockWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_NO_PAYLOAD_REF }]])
      );
      const validateWorkflow = jest.fn().mockResolvedValue({
        valid: false,
        diagnostics: [
          {
            severity: 'error',
            ruleId: 'invalidVariableReference',
            message: 'Unresolvable Liquid reference',
            source: 'variables',
          },
        ],
      });

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
        attachments: createMockAttachments(),
        workflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
        validateWorkflow,
        request: mockRequest,
      });

      expect(result.diagnostics).toHaveLength(2);
      expect(result.diagnostics.map((d) => d.source)).toEqual(
        expect.arrayContaining(['structural', 'workflow-validation'])
      );
    });
  });
});
