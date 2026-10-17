/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { ActionPolicyOperationValidationError } from './operations';
import { WORKFLOW_DISPATCH_PAYLOAD_SKILL_REF } from '../../skills/action_policy_management_skill';
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

const YAML_VALID_WITH_PAYLOAD_LIQUID = `
name: notify
triggers:
  - type: manual
    inputs:
      properties:
        payload:
          $ref: '#/kibana/definitions/alertingV2NotificationGroup'
steps:
  - name: send_email
    type: email
    connector-id: abc123
    with:
      to:
        - oncall@example.com
      subject: "Alert fired"
      message: |
        {%- for alert in inputs.payload.alerts -%}
        - Rule: {{ inputs.payload.rules[alert.rule_id].name }}
          Host: {{ alert.data.host.name | default: "unknown" }}
        {%- endfor -%}
`;

const YAML_DUAL_TRIGGERS_MANUAL_AND_ALERT = `
name: notify
triggers:
  - type: manual
    inputs:
      properties:
        payload:
          $ref: '#/kibana/definitions/alertingV2NotificationGroup'
  - type: alert
steps:
  - name: send_email
    type: email
    connector-id: abc123
    with:
      to:
        - oncall@example.com
      subject: "Alert: {{ event.rule.name }}"
      message: "{{ event.alerts | size }} alerts fired"
`;

const YAML_LIQUID_NO_PAYLOAD_REF_IN_BODY = `
name: notify
triggers:
  - type: manual
    inputs:
      properties:
        payload:
          $ref: '#/kibana/definitions/alertingV2NotificationGroup'
steps:
  - name: send_email
    type: email
    connector-id: abc123
    with:
      to:
        - oncall@example.com
      subject: "Alert at {{ now | date_to_xmlschema }}"
      message: "An alert was fired."
`;

const YAML_WRONG_PAYLOAD_FIELDS = `
name: notify
triggers:
  - type: manual
    inputs:
      properties:
        payload:
          $ref: '#/kibana/definitions/alertingV2NotificationGroup'
steps:
  - name: send_email
    type: email
    connector-id: abc123
    with:
      to:
        - oncall@example.com
      subject: "Alert: {{ inputs.payload.rule.name | default: 'Unknown' }}"
      message: |
        Rule: {{ inputs.payload.rule.name }}
        Space: {{ inputs.payload.spaceId }}
        Alerts: {{ inputs.payload.alerts | size }}
`;

const YAML_ASSIGN_ALIAS_WITH_PAYLOAD = `
name: notify
triggers:
  - type: manual
    inputs:
      properties:
        payload:
          $ref: '#/kibana/definitions/alertingV2NotificationGroup'
steps:
  - name: send_email
    type: email
    connector-id: abc123
    with:
      to:
        - oncall@example.com
      subject: "Alert"
      message: |
        {%- assign ctx = event | default: inputs.payload -%}
        Rule: {{ ctx.rule.name }}
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

const createMockPersistedWorkflowLookup = (
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
        persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      })
    ).rejects.toThrow(ActionPolicyOperationValidationError);

    await expect(
      validateDestinations([{ type: 'workflow', id: 'att-workflow-1' }], {
        attachments,
        persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
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
        persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      })
    ).resolves.toEqual({ diagnostics: [] });
  });

  it('passes when destination matches a persisted workflow', async () => {
    const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
      new Map([['persisted-wf-1', { id: 'persisted-wf-1' }]])
    );

    await expect(
      validateDestinations([{ type: 'workflow', id: 'persisted-wf-1' }], {
        attachments: createMockAttachments(),
        persistedWorkflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      })
    ).resolves.toEqual({ diagnostics: [] });

    expect(persistedWorkflowLookup.getWorkflow).toHaveBeenCalledWith('persisted-wf-1', 'default');
  });

  it('throws a specific error when the destination ID is a connector', async () => {
    const connectorLookup = createMockConnectorLookup(
      new Map([['conn-email-1', { id: 'conn-email-1', name: 'SRE On-Call Alerts' }]])
    );

    await expect(
      validateDestinations([{ type: 'workflow', id: 'conn-email-1' }], {
        attachments: createMockAttachments(),
        persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
        connectorLookup,
        spaceId: 'default',
      })
    ).rejects.toThrow(ActionPolicyOperationValidationError);

    await expect(
      validateDestinations([{ type: 'workflow', id: 'conn-email-1' }], {
        attachments: createMockAttachments(),
        persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
        connectorLookup,
        spaceId: 'default',
      })
    ).rejects.toThrow(/is a connector \("SRE On-Call Alerts"\), not a workflow/);
  });

  it('throws a generic error when the destination ID is unknown', async () => {
    await expect(
      validateDestinations([{ type: 'workflow', id: 'unknown-id-123' }], {
        attachments: createMockAttachments(),
        persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      })
    ).rejects.toThrow(ActionPolicyOperationValidationError);

    await expect(
      validateDestinations([{ type: 'workflow', id: 'unknown-id-123' }], {
        attachments: createMockAttachments(),
        persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
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
    const persistedWorkflowLookup = createMockPersistedWorkflowLookup();
    const connectorLookup = createMockConnectorLookup();

    await validateDestinations([{ type: 'workflow', id: 'notify-high-cpu' }], {
      attachments,
      persistedWorkflowLookup,
      connectorLookup,
      spaceId: 'default',
    });

    expect(persistedWorkflowLookup.getWorkflow).not.toHaveBeenCalled();
    expect(connectorLookup.findConnectorById).not.toHaveBeenCalled();
  });

  it('skips connector lookup when persisted workflow matches', async () => {
    const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
      new Map([['wf-1', { id: 'wf-1' }]])
    );
    const connectorLookup = createMockConnectorLookup();

    await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
      attachments: createMockAttachments(),
      persistedWorkflowLookup,
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
          persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
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
        persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
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
          persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
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
          persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
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
          persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        })
      ).rejects.toThrow(/does not have a "manual" trigger/);
    });

    it('throws when a persisted workflow has no manual trigger', async () => {
      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
        new Map([['wf-alert-only', { id: 'wf-alert-only', yaml: YAML_ALERT_TRIGGER_ONLY }]])
      );

      await expect(
        validateDestinations([{ type: 'workflow', id: 'wf-alert-only' }], {
          attachments: createMockAttachments(),
          persistedWorkflowLookup,
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        })
      ).rejects.toThrow(/does not have a "manual" trigger/);
    });

    it('returns a warning instead of throwing when blockOnStructuralErrors is false', async () => {
      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
        new Map([['wf-alert-only', { id: 'wf-alert-only', yaml: YAML_ALERT_TRIGGER_ONLY }]])
      );

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-alert-only' }], {
        attachments: createMockAttachments(),
        persistedWorkflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
        blockOnStructuralErrors: false,
      });

      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          destinationId: 'wf-alert-only',
          severity: 'warning',
          source: 'structural',
          message: expect.stringContaining('does not have a "manual" trigger'),
        }),
      ]);
      expect(result.diagnostics[0]?.message).toContain(WORKFLOW_DISPATCH_PAYLOAD_SKILL_REF);
    });

    it('does not throw when a persisted workflow has no yaml available (nothing to check)', async () => {
      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
        new Map([['wf-no-yaml', { id: 'wf-no-yaml' }]])
      );

      await expect(
        validateDestinations([{ type: 'workflow', id: 'wf-no-yaml' }], {
          attachments: createMockAttachments(),
          persistedWorkflowLookup,
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        })
      ).resolves.toEqual({ diagnostics: [] });
    });
  });

  describe('structural checks — inputs.payload ref', () => {
    it('throws when the manual trigger declares no inputs at all', async () => {
      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_NO_PAYLOAD_REF }]])
      );

      await expect(
        validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
          attachments: createMockAttachments(),
          persistedWorkflowLookup,
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        })
      ).rejects.toThrow(ActionPolicyOperationValidationError);

      await expect(
        validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
          attachments: createMockAttachments(),
          persistedWorkflowLookup,
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        })
      ).rejects.toThrow(/does not declare `inputs\.payload`/);
    });

    it('throws when inputs.payload is declared without a $ref', async () => {
      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_WITH_UNRELATED_PAYLOAD }]])
      );

      await expect(
        validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
          attachments: createMockAttachments(),
          persistedWorkflowLookup,
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        })
      ).rejects.toThrow(ActionPolicyOperationValidationError);
    });

    it('throws when inputs.payload $ref points at an unrelated/unresolvable definition', async () => {
      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_WITH_WRONG_REF }]])
      );

      await expect(
        validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
          attachments: createMockAttachments(),
          persistedWorkflowLookup,
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        })
      ).rejects.toThrow(ActionPolicyOperationValidationError);
    });

    it('returns a warning instead of throwing when blockOnStructuralErrors is false', async () => {
      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_NO_PAYLOAD_REF }]])
      );

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
        attachments: createMockAttachments(),
        persistedWorkflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
        blockOnStructuralErrors: false,
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

    it('returns no diagnostics when inputs.payload correctly references alertingV2NotificationGroup', async () => {
      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF }]])
      );

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
        attachments: createMockAttachments(),
        persistedWorkflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      });

      expect(result.diagnostics).toEqual([]);
    });
  });

  describe('workflow validation service (variable refs)', () => {
    it('calls validateWorkflow with the resolved yaml and surfaces error diagnostics as warnings', async () => {
      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
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
        persistedWorkflowLookup,
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
      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
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
        persistedWorkflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
        validateWorkflow,
        request: mockRequest,
      });

      expect(result.diagnostics).toEqual([]);
    });

    it('does not call validateWorkflow when it is not provided', async () => {
      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF }]])
      );

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
        attachments: createMockAttachments(),
        persistedWorkflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      });

      expect(result.diagnostics).toEqual([]);
    });

    it('does not call validateWorkflow when request is not provided', async () => {
      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF }]])
      );
      const validateWorkflow = jest.fn().mockResolvedValue({ valid: true, diagnostics: [] });

      await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
        attachments: createMockAttachments(),
        persistedWorkflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
        validateWorkflow,
      });

      expect(validateWorkflow).not.toHaveBeenCalled();
    });

    it('does not throw and does not add diagnostics when validateWorkflow rejects', async () => {
      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF }]])
      );
      const validateWorkflow = jest.fn().mockRejectedValue(new Error('service unavailable'));

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
        attachments: createMockAttachments(),
        persistedWorkflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
        validateWorkflow,
        request: mockRequest,
      });

      expect(result.diagnostics).toEqual([]);
    });

    it('combines structural and workflow-validation diagnostics for a doubly-invalid workflow (non-blocking mode)', async () => {
      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
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
        persistedWorkflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
        validateWorkflow,
        request: mockRequest,
        blockOnStructuralErrors: false,
      });

      expect(result.diagnostics).toHaveLength(2);
      expect(result.diagnostics.map((d) => d.source)).toEqual(
        expect.arrayContaining(['structural', 'workflow-validation'])
      );
    });

    it('still throws after collecting all errors including workflow-validation in blocking mode', async () => {
      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
        new Map([['wf-1', { id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_NO_PAYLOAD_REF }]])
      );
      const validateWorkflow = jest.fn().mockResolvedValue({
        valid: true,
        diagnostics: [],
      });

      await expect(
        validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
          attachments: createMockAttachments(),
          persistedWorkflowLookup,
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
          validateWorkflow,
          request: mockRequest,
        })
      ).rejects.toThrow(ActionPolicyOperationValidationError);

      expect(validateWorkflow).toHaveBeenCalled();
    });
  });

  describe('common template mistakes — alert trigger alongside manual', () => {
    it('throws when the workflow has both manual and alert triggers', async () => {
      const attachments = createMockAttachments([
        {
          id: 'att-wf',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [
            { data: { yaml: YAML_DUAL_TRIGGERS_MANUAL_AND_ALERT, workflowId: 'wf-dual' } },
          ],
        },
      ]);

      await expect(
        validateDestinations([{ type: 'workflow', id: 'wf-dual' }], {
          attachments,
          persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        })
      ).rejects.toThrow(/declares a "type: alert" trigger alongside the manual trigger/);
    });

    it('returns a warning when blocking is false', async () => {
      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
        new Map([['wf-dual', { id: 'wf-dual', yaml: YAML_DUAL_TRIGGERS_MANUAL_AND_ALERT }]])
      );

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-dual' }], {
        attachments: createMockAttachments(),
        persistedWorkflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
        blockOnStructuralErrors: false,
      });

      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            severity: 'warning',
            source: 'structural',
            message: expect.stringContaining('type: alert'),
          }),
        ])
      );
    });

    it('does not flag a workflow that has only a manual trigger', async () => {
      const attachments = createMockAttachments([
        {
          id: 'att-wf',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [{ data: { yaml: YAML_VALID_WITH_PAYLOAD_LIQUID, workflowId: 'wf-ok' } }],
        },
      ]);

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-ok' }], {
        attachments,
        persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      });

      expect(result.diagnostics).toEqual([]);
    });
  });

  describe('common template mistakes — payload liquid presence', () => {
    it('throws when templates have Liquid but never reference inputs.payload', async () => {
      const attachments = createMockAttachments([
        {
          id: 'att-wf',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [
            { data: { yaml: YAML_LIQUID_NO_PAYLOAD_REF_IN_BODY, workflowId: 'wf-no-payload' } },
          ],
        },
      ]);

      await expect(
        validateDestinations([{ type: 'workflow', id: 'wf-no-payload' }], {
          attachments,
          persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        })
      ).rejects.toThrow(/templates never reference `inputs\.payload`/);
    });

    it('does not flag when templates use inputs.payload via an assign alias', async () => {
      const attachments = createMockAttachments([
        {
          id: 'att-wf',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [{ data: { yaml: YAML_ASSIGN_ALIAS_WITH_PAYLOAD, workflowId: 'wf-alias' } }],
        },
      ]);

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-alias' }], {
        attachments,
        persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      });

      const presenceDiag = result.diagnostics.filter((d) =>
        d.message.includes('templates never reference')
      );
      expect(presenceDiag).toHaveLength(0);
    });

    it('skips the check when YAML has no Liquid expressions at all', async () => {
      const attachments = createMockAttachments([
        {
          id: 'att-wf',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [
            { data: { yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF, workflowId: 'wf-scaffold' } },
          ],
        },
      ]);

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-scaffold' }], {
        attachments,
        persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      });

      expect(result.diagnostics).toEqual([]);
    });
  });

  describe('common template mistakes — payload field paths', () => {
    it('throws when templates reference nonexistent top-level payload fields', async () => {
      const attachments = createMockAttachments([
        {
          id: 'att-wf',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [{ data: { yaml: YAML_WRONG_PAYLOAD_FIELDS, workflowId: 'wf-wrong' } }],
        },
      ]);

      await expect(
        validateDestinations([{ type: 'workflow', id: 'wf-wrong' }], {
          attachments,
          persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        })
      ).rejects.toThrow(/payload fields that do not exist/);
    });

    it('includes the wrong field names and valid alternatives in the error', async () => {
      const attachments = createMockAttachments([
        {
          id: 'att-wf',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [{ data: { yaml: YAML_WRONG_PAYLOAD_FIELDS, workflowId: 'wf-wrong' } }],
        },
      ]);

      let caught: ActionPolicyOperationValidationError | undefined;
      try {
        await validateDestinations([{ type: 'workflow', id: 'wf-wrong' }], {
          attachments,
          persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        });
      } catch (err) {
        caught = err as ActionPolicyOperationValidationError;
      }
      expect(caught).toBeInstanceOf(ActionPolicyOperationValidationError);
      const msg = caught!.message;

      expect(msg).toContain('`inputs.payload.rule`');
      expect(msg).toContain('`inputs.payload.spaceId`');
      expect(msg).toContain('`alerts`');
      expect(msg).toContain('`rules`');
      expect(msg).toContain('inputs.payload.rules[alert.rule_id].name');
    });

    it('does not flag valid top-level fields like alerts and rules', async () => {
      const attachments = createMockAttachments([
        {
          id: 'att-wf',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [{ data: { yaml: YAML_VALID_WITH_PAYLOAD_LIQUID, workflowId: 'wf-ok' } }],
        },
      ]);

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-ok' }], {
        attachments,
        persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      });

      expect(result.diagnostics).toEqual([]);
    });

    it('catches inputs.payload.rule.name even with a | default: filter', async () => {
      const yaml = `
name: notify
triggers:
  - type: manual
    inputs:
      properties:
        payload:
          $ref: '#/kibana/definitions/alertingV2NotificationGroup'
steps:
  - name: send_email
    type: email
    connector-id: abc123
    with:
      to:
        - oncall@example.com
      subject: "{{ inputs.payload.rule.name | default: 'Unknown' }}"
      message: "{{ inputs.payload.alerts | size }} alerts"
`;

      const attachments = createMockAttachments([
        {
          id: 'att-wf',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [{ data: { yaml, workflowId: 'wf-default-filter' } }],
        },
      ]);

      await expect(
        validateDestinations([{ type: 'workflow', id: 'wf-default-filter' }], {
          attachments,
          persistedWorkflowLookup: createMockPersistedWorkflowLookup(),
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        })
      ).rejects.toThrow(/payload fields that do not exist.*`inputs\.payload\.rule`/);
    });
  });

  describe('aggregated error — every error path in one throw', () => {
    it('collects destination-resolution errors, structural errors, and workflow-validation warnings into a single throw', async () => {
      const attachments = createMockAttachments([
        // Attachment-ID misuse: agent used the attachment id instead of workflowId
        {
          id: 'att-email-wf',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [{ data: { yaml: 'name: email', workflowId: 'wf-email-real' } }],
        },
        // Attachment without a workflowId at all
        {
          id: 'att-no-wfid',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [{ data: { yaml: 'name: bare' } }],
        },
      ]);

      const persistedWorkflowLookup = createMockPersistedWorkflowLookup(
        new Map([
          // Missing manual trigger entirely (alert trigger only)
          ['wf-alert-only', { id: 'wf-alert-only', yaml: YAML_ALERT_TRIGGER_ONLY }],
          // Has manual trigger but missing inputs.payload $ref
          ['wf-no-ref', { id: 'wf-no-ref', yaml: YAML_MANUAL_TRIGGER_NO_PAYLOAD_REF }],
          // Has manual trigger with wrong $ref
          ['wf-wrong-ref', { id: 'wf-wrong-ref', yaml: YAML_MANUAL_TRIGGER_WITH_WRONG_REF }],
          // Has manual trigger with plain type instead of $ref
          [
            'wf-plain-payload',
            { id: 'wf-plain-payload', yaml: YAML_MANUAL_TRIGGER_WITH_UNRELATED_PAYLOAD },
          ],
          // Valid workflow — but validateWorkflow returns a variable-ref error
          ['wf-bad-liquid', { id: 'wf-bad-liquid', yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF }],
        ])
      );

      const connectorLookup = createMockConnectorLookup(
        new Map([['conn-slack', { id: 'conn-slack', name: 'SRE Slack On-Call' }]])
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

      let caught: ActionPolicyOperationValidationError | undefined;
      try {
        await validateDestinations(
          [
            { type: 'workflow', id: 'att-email-wf' }, // attachment-ID misuse (has workflowId)
            { type: 'workflow', id: 'att-no-wfid' }, // attachment-ID misuse (no workflowId)
            { type: 'workflow', id: 'conn-slack' }, // connector ID
            { type: 'workflow', id: 'totally-unknown-999' }, // unknown ID
            { type: 'workflow', id: 'wf-alert-only' }, // missing manual trigger
            { type: 'workflow', id: 'wf-no-ref' }, // missing inputs.payload $ref
            { type: 'workflow', id: 'wf-wrong-ref' }, // wrong $ref target
            { type: 'workflow', id: 'wf-plain-payload' }, // plain type, no $ref
            { type: 'workflow', id: 'wf-bad-liquid' }, // valid structure, bad Liquid variable
          ],
          {
            attachments,
            persistedWorkflowLookup,
            connectorLookup,
            spaceId: 'default',
            validateWorkflow,
            request: mockRequest,
          }
        );
      } catch (err) {
        caught = err as ActionPolicyOperationValidationError;
      }

      // Must throw, not return
      expect(caught).toBeInstanceOf(ActionPolicyOperationValidationError);
      const msg = caught!.message;

      // Header: 8 errors, 4 warnings (validateWorkflow fires for every workflow
      // that has a manual trigger — wf-no-ref, wf-wrong-ref, wf-plain-payload,
      // wf-bad-liquid — producing one warning each).
      expect(msg).toMatch(/^Destination validation failed \(8 errors, 4 warnings\):/);

      // --- destination-resolution errors ---

      // [1] attachment-ID misuse with workflowId hint
      expect(msg).toContain(
        '[1] [error] Destination ID "att-email-wf" is a workflow attachment ID'
      );
      expect(msg).toContain('The correct workflow ID for this attachment is "wf-email-real"');

      // [2] attachment-ID misuse without workflowId
      expect(msg).toContain('[2] [error] Destination ID "att-no-wfid" is a workflow attachment ID');
      expect(msg).toContain('has no workflowId');

      // [3] connector ID
      expect(msg).toContain(
        '[3] [error] Destination ID "conn-slack" is a connector ("SRE Slack On-Call")'
      );

      // [4] unknown ID
      expect(msg).toContain(
        '[4] [error] Destination ID "totally-unknown-999" is not a valid workflow'
      );

      // --- structural errors ---

      // [5] missing manual trigger entirely
      expect(msg).toContain(
        '[5] [error] Workflow "wf-alert-only" does not have a "manual" trigger'
      );

      // [6] missing payload $ref — has manual trigger but no inputs.payload.$ref
      expect(msg).toContain('[6] [error] Workflow "wf-no-ref" does not declare `inputs.payload`');

      // [7] workflow-validation warning follows wf-no-ref's structural error
      expect(msg).toContain('[7] [warning] [invalidVariablePath]');

      // [8] wrong $ref target
      expect(msg).toContain(
        '[8] [error] Workflow "wf-wrong-ref" does not declare `inputs.payload`'
      );

      // [9] workflow-validation warning follows wf-wrong-ref
      expect(msg).toContain('[9] [warning] [invalidVariablePath]');

      // [10] plain type payload, no $ref
      expect(msg).toContain(
        '[10] [error] Workflow "wf-plain-payload" does not declare `inputs.payload`'
      );

      // [11] workflow-validation warning follows wf-plain-payload
      expect(msg).toContain('[11] [warning] [invalidVariablePath]');

      // [12] workflow-validation warning on wf-bad-liquid (valid structure, bad Liquid variable)
      expect(msg).toContain('[12] [warning] [invalidVariablePath]');
      expect(msg).toContain('episodez');

      // All structural errors point to the referenced content skill path
      expect(msg).toContain(`Referenced content: ${WORKFLOW_DISPATCH_PAYLOAD_SKILL_REF}`);
    });
  });
});
