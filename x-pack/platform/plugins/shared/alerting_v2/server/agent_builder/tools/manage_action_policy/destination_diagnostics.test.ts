/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import {
  DestinationValidator,
  type AttachmentIndex,
  type DestinationValidationConfig,
} from './destination_diagnostics';
import { ActionPolicyOperationValidationError } from './operations';
import { WORKFLOW_DISPATCH_PAYLOAD_SKILL_REF } from '../../skills/action_policy_management_references';

// ---------------------------------------------------------------------------
// YAML fixtures
// ---------------------------------------------------------------------------

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

const YAML_INVENTED_INPUTS_NO_PAYLOAD = `
name: notify
triggers:
  - type: manual
    inputs:
      properties:
        alerts:
          type: array
          items:
            type: object
        rule_name:
          type: string
      required:
        - alerts
        - rule_name
`;

const YAML_PAYLOAD_REF_WITH_EXTRA_INPUT = `
name: notify
triggers:
  - type: manual
    inputs:
      properties:
        payload:
          $ref: '#/kibana/definitions/alertingV2NotificationGroup'
        rule_name:
          type: string
`;

const YAML_MANUAL_AND_SCHEDULED_TRIGGERS = `
name: notify
triggers:
  - type: manual
    inputs:
      properties:
        payload:
          $ref: '#/kibana/definitions/alertingV2NotificationGroup'
  - type: scheduled
    with:
      every: 1h
`;

const YAML_PAYLOAD_REF_REQUIRED_WITH_DESCRIPTION = `
name: notify
triggers:
  - type: manual
    inputs:
      properties:
        payload:
          $ref: '#/kibana/definitions/alertingV2NotificationGroup'
          description: Notification group dispatched by the action policy
      required:
        - payload
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const emptyAttachmentIndex: AttachmentIndex = {
  inMemoryWorkflowIds: new Set(),
  attachmentToWorkflowId: new Map(),
  inMemoryWorkflowIdToYaml: new Map(),
};

const mockRequest = {} as KibanaRequest;

const createValidator = (
  overrides: Partial<DestinationValidationConfig> = {}
): DestinationValidator =>
  new DestinationValidator({
    blockOnStructuralErrors: true,
    spaceId: 'default',
    persistedWorkflowLookup: { getWorkflow: jest.fn().mockResolvedValue(null) },
    connectorLookup: { findConnectorById: jest.fn().mockResolvedValue(null) },
    attachmentIndex: emptyAttachmentIndex,
    ...overrides,
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DestinationValidator', () => {
  // -------------------------------------------------------------------------
  // Resolution — resolveFromAttachments
  // -------------------------------------------------------------------------
  describe('resolveFromAttachments', () => {
    it('returns true and validates YAML when destinationId matches a workflowId', async () => {
      const validator = createValidator({
        attachmentIndex: {
          inMemoryWorkflowIds: new Set(['wf-1']),
          attachmentToWorkflowId: new Map(),
          inMemoryWorkflowIdToYaml: new Map([['wf-1', YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF]]),
        },
      });

      expect(await validator.resolveFromAttachments('wf-1')).toBe(true);
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('records an error when destinationId matches an attachment ID (not workflowId)', async () => {
      const validator = createValidator({
        attachmentIndex: {
          inMemoryWorkflowIds: new Set(),
          attachmentToWorkflowId: new Map([['att-1', 'wf-real']]),
          inMemoryWorkflowIdToYaml: new Map(),
        },
      });

      expect(await validator.resolveFromAttachments('att-1')).toBe(true);
      expect(() => validator.finalize()).toThrow(/is a workflow attachment ID, not a workflow ID/);
    });

    it('includes the correct workflowId hint when available', async () => {
      const validator = createValidator({
        attachmentIndex: {
          inMemoryWorkflowIds: new Set(),
          attachmentToWorkflowId: new Map([['att-1', 'wf-real']]),
          inMemoryWorkflowIdToYaml: new Map(),
        },
      });

      await validator.resolveFromAttachments('att-1');
      expect(() => validator.finalize()).toThrow(
        /The correct workflow ID for this attachment is "wf-real"/
      );
    });

    it('mentions missing workflowId when attachment has none', async () => {
      const validator = createValidator({
        attachmentIndex: {
          inMemoryWorkflowIds: new Set(),
          attachmentToWorkflowId: new Map([['att-bare', undefined]]),
          inMemoryWorkflowIdToYaml: new Map(),
        },
      });

      await validator.resolveFromAttachments('att-bare');
      expect(() => validator.finalize()).toThrow(/has no workflowId/);
    });

    it('returns false when destinationId is not in memory', async () => {
      const validator = createValidator();
      expect(await validator.resolveFromAttachments('unknown')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Resolution — resolveFromPersistedWorkflow
  // -------------------------------------------------------------------------
  describe('resolveFromPersistedWorkflow', () => {
    it('returns true and validates YAML when persisted workflow exists', async () => {
      const getWorkflow = jest
        .fn()
        .mockResolvedValue({ id: 'wf-1', yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF });
      const validator = createValidator({
        persistedWorkflowLookup: { getWorkflow },
      });

      expect(await validator.resolveFromPersistedWorkflow('wf-1')).toBe(true);
      expect(getWorkflow).toHaveBeenCalledWith('wf-1', 'default');
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('returns true with no diagnostics when persisted workflow has no yaml', async () => {
      const validator = createValidator({
        persistedWorkflowLookup: {
          getWorkflow: jest.fn().mockResolvedValue({ id: 'wf-1' }),
        },
      });

      expect(await validator.resolveFromPersistedWorkflow('wf-1')).toBe(true);
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('returns false when persisted workflow does not exist', async () => {
      const validator = createValidator();
      expect(await validator.resolveFromPersistedWorkflow('missing')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Resolution — resolveFromConnector
  // -------------------------------------------------------------------------
  describe('resolveFromConnector', () => {
    it('records an error when destinationId matches a connector', async () => {
      const validator = createValidator({
        connectorLookup: {
          findConnectorById: jest.fn().mockResolvedValue({ id: 'conn-1', name: 'SRE On-Call' }),
        },
      });

      expect(await validator.resolveFromConnector('conn-1')).toBe(true);
      expect(() => validator.finalize()).toThrow(
        /is a connector \("SRE On-Call"\), not a workflow/
      );
    });

    it('returns false when no connector matches', async () => {
      const validator = createValidator();
      expect(await validator.resolveFromConnector('not-a-connector')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Resolution — resolveDestination (full priority chain)
  // -------------------------------------------------------------------------
  describe('resolveDestination', () => {
    it('stops at in-memory attachments and does not call persisted or connector lookups', async () => {
      const getWorkflow = jest.fn();
      const findConnectorById = jest.fn();
      const validator = createValidator({
        attachmentIndex: {
          inMemoryWorkflowIds: new Set(['wf-1']),
          attachmentToWorkflowId: new Map(),
          inMemoryWorkflowIdToYaml: new Map([['wf-1', YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF]]),
        },
        persistedWorkflowLookup: { getWorkflow },
        connectorLookup: { findConnectorById },
      });

      await validator.resolveDestination('wf-1');
      expect(getWorkflow).not.toHaveBeenCalled();
      expect(findConnectorById).not.toHaveBeenCalled();
    });

    it('stops at persisted workflow and does not call connector lookup', async () => {
      const findConnectorById = jest.fn();
      const validator = createValidator({
        persistedWorkflowLookup: {
          getWorkflow: jest.fn().mockResolvedValue({ id: 'wf-1' }),
        },
        connectorLookup: { findConnectorById },
      });

      await validator.resolveDestination('wf-1');
      expect(findConnectorById).not.toHaveBeenCalled();
    });

    it('records unknown-destination error when nothing matches', async () => {
      const validator = createValidator();
      await validator.resolveDestination('totally-unknown');
      expect(() => validator.finalize()).toThrow(/is not a valid workflow in this space/);
    });
  });

  // -------------------------------------------------------------------------
  // Structural checks — manual trigger
  // -------------------------------------------------------------------------
  describe('validateManualTrigger', () => {
    it('returns the manual trigger when present', () => {
      const validator = createValidator();
      const triggers = [{ type: 'manual', inputs: {} }];
      const result = validator.validateManualTrigger('wf-1', triggers);
      expect(result).toEqual({ type: 'manual', inputs: {} });
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('records an error when no manual trigger exists (blocking mode)', () => {
      const validator = createValidator({ blockOnStructuralErrors: true });
      const result = validator.validateManualTrigger('wf-1', [{ type: 'alert' }]);
      expect(result).toBeUndefined();
      expect(() => validator.finalize()).toThrow(/does not have a "manual" trigger/);
    });

    it('records a warning when no manual trigger exists (non-blocking mode)', () => {
      const validator = createValidator({ blockOnStructuralErrors: false });
      validator.validateManualTrigger('wf-1', [{ type: 'alert' }]);

      const { diagnostics } = validator.finalize();
      expect(diagnostics).toEqual([
        expect.objectContaining({
          destinationId: 'wf-1',
          severity: 'warning',
          source: 'structural',
          message: expect.stringContaining('does not have a "manual" trigger'),
        }),
      ]);
    });

    it('records an error when triggers is undefined', () => {
      const validator = createValidator();
      validator.validateManualTrigger('wf-1', undefined);
      expect(() => validator.finalize()).toThrow(/does not have a "manual" trigger/);
    });

    it('records an error when triggers is empty', () => {
      const validator = createValidator();
      validator.validateManualTrigger('wf-1', []);
      expect(() => validator.finalize()).toThrow(/does not have a "manual" trigger/);
    });

    it('includes the fix snippet with the $ref in the message', () => {
      const validator = createValidator();
      validator.validateManualTrigger('wf-1', []);
      expect(() => validator.finalize()).toThrow(/alertingV2NotificationGroup/);
    });

    it('includes the skill reference path in the message', () => {
      const validator = createValidator();
      validator.validateManualTrigger('wf-1', []);
      expect(() => validator.finalize()).toThrow(
        new RegExp(WORKFLOW_DISPATCH_PAYLOAD_SKILL_REF.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
    });
  });

  // -------------------------------------------------------------------------
  // Structural checks — payload ref
  // -------------------------------------------------------------------------
  describe('validatePayloadRef', () => {
    it('records no diagnostic when payload $ref resolves to alertingV2NotificationGroup', () => {
      const validator = createValidator();
      const manualTrigger = {
        type: 'manual',
        inputs: {
          properties: {
            payload: { $ref: '#/kibana/definitions/alertingV2NotificationGroup' },
          },
        },
      };
      validator.validatePayloadRef('wf-1', manualTrigger);
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('records an error when manual trigger has no inputs at all (blocking)', () => {
      const validator = createValidator({ blockOnStructuralErrors: true });
      validator.validatePayloadRef('wf-1', { type: 'manual' });
      expect(() => validator.finalize()).toThrow(/does not declare `inputs\.payload`/);
    });

    it('records an error when inputs.payload is a plain type (no $ref)', () => {
      const validator = createValidator();
      validator.validatePayloadRef('wf-1', {
        type: 'manual',
        inputs: { properties: { payload: { type: 'object' } } },
      });
      expect(() => validator.finalize()).toThrow(/does not declare `inputs\.payload`/);
    });

    it('records an error when $ref points at a different schema', () => {
      const validator = createValidator();
      validator.validatePayloadRef('wf-1', {
        type: 'manual',
        inputs: {
          properties: {
            payload: { $ref: '#/kibana/definitions/someOtherSchema' },
          },
        },
      });
      expect(() => validator.finalize()).toThrow(/does not declare `inputs\.payload`/);
    });

    it('records a warning instead of error when blockOnStructuralErrors is false', () => {
      const validator = createValidator({ blockOnStructuralErrors: false });
      validator.validatePayloadRef('wf-1', { type: 'manual' });
      const { diagnostics } = validator.finalize();
      expect(diagnostics).toEqual([
        expect.objectContaining({
          severity: 'warning',
          source: 'structural',
          message: expect.stringContaining('does not declare `inputs.payload`'),
        }),
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Structural checks — manual trigger inputs
  // -------------------------------------------------------------------------
  describe('validateManualTriggerInputs', () => {
    const payloadRef = { $ref: '#/kibana/definitions/alertingV2NotificationGroup' };

    it('records no diagnostic when only payload is declared and required', () => {
      const validator = createValidator();
      validator.validateManualTriggerInputs('wf-1', {
        type: 'manual',
        inputs: { properties: { payload: payloadRef }, required: ['payload'] },
      });
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('records no diagnostic when the manual trigger has no inputs', () => {
      const validator = createValidator();
      validator.validateManualTriggerInputs('wf-1', { type: 'manual' });
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('records an error listing extra input properties alongside payload (blocking)', () => {
      const validator = createValidator({ blockOnStructuralErrors: true });
      validator.validateManualTriggerInputs('wf-1', {
        type: 'manual',
        inputs: { properties: { payload: payloadRef, rule_name: { type: 'string' } } },
      });
      expect(() => validator.finalize()).toThrow(
        /unexpected input properties: `rule_name` \(only `payload` is allowed/
      );
    });

    it('records an error listing extra required entries', () => {
      const validator = createValidator();
      validator.validateManualTriggerInputs('wf-1', {
        type: 'manual',
        inputs: { properties: { payload: payloadRef }, required: ['payload', 'alerts'] },
      });
      expect(() => validator.finalize()).toThrow(
        /unexpected `required` entries: `alerts` \(only `payload` may be required\)/
      );
    });

    it('reports extra properties and required entries in a single diagnostic', () => {
      const validator = createValidator({ blockOnStructuralErrors: false });
      validator.validateManualTriggerInputs('wf-1', {
        type: 'manual',
        inputs: {
          properties: { alerts: { type: 'array' }, rule_name: { type: 'string' } },
          required: ['alerts', 'rule_name'],
        },
      });
      const { diagnostics } = validator.finalize();
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain(
        'unexpected input properties: `alerts`, `rule_name`'
      );
      expect(diagnostics[0].message).toContain(
        'unexpected `required` entries: `alerts`, `rule_name`'
      );
      expect(diagnostics[0].message).toContain(WORKFLOW_DISPATCH_PAYLOAD_SKILL_REF);
    });

    it('records a warning instead of error when blockOnStructuralErrors is false', () => {
      const validator = createValidator({ blockOnStructuralErrors: false });
      validator.validateManualTriggerInputs('wf-1', {
        type: 'manual',
        inputs: { properties: { payload: payloadRef, rule_name: { type: 'string' } } },
      });
      expect(validator.finalize().diagnostics).toEqual([
        expect.objectContaining({
          severity: 'warning',
          source: 'structural',
          message: expect.stringContaining('declares manual-trigger inputs other than `payload`'),
        }),
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Structural checks — triggers other than the single manual trigger
  // -------------------------------------------------------------------------
  describe('validateNoExtraTriggers', () => {
    it('records no diagnostic when only the manual trigger is present', () => {
      const validator = createValidator();
      const manualTrigger = { type: 'manual' };
      validator.validateNoExtraTriggers('wf-1', [manualTrigger], manualTrigger);
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('records an error when a scheduled trigger is present (blocking)', () => {
      const validator = createValidator({ blockOnStructuralErrors: true });
      const manualTrigger = { type: 'manual' };
      validator.validateNoExtraTriggers(
        'wf-1',
        [manualTrigger, { type: 'scheduled' }],
        manualTrigger
      );
      expect(() => validator.finalize()).toThrow(
        /declares triggers other than the single manual trigger: `type: scheduled`/
      );
    });

    it('records an error for a duplicate manual trigger', () => {
      const validator = createValidator();
      const manualTrigger = { type: 'manual' };
      validator.validateNoExtraTriggers('wf-1', [manualTrigger, { type: 'manual' }], manualTrigger);
      expect(() => validator.finalize()).toThrow(/`type: manual`/);
    });

    it('leaves alert triggers to validateNoAlertTrigger', () => {
      const validator = createValidator();
      const manualTrigger = { type: 'manual' };
      validator.validateNoExtraTriggers('wf-1', [manualTrigger, { type: 'alert' }], manualTrigger);
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('records a warning when blocking is false', () => {
      const validator = createValidator({ blockOnStructuralErrors: false });
      const manualTrigger = { type: 'manual' };
      validator.validateNoExtraTriggers(
        'wf-1',
        [manualTrigger, { type: 'scheduled' }],
        manualTrigger
      );
      expect(validator.finalize().diagnostics).toEqual([
        expect.objectContaining({
          severity: 'warning',
          source: 'structural',
          message: expect.stringContaining('`type: scheduled`'),
        }),
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Common template mistakes — alert trigger alongside manual
  // -------------------------------------------------------------------------
  describe('validateNoAlertTrigger', () => {
    it('records an error when an alert trigger is present (blocking)', () => {
      const validator = createValidator({ blockOnStructuralErrors: true });
      validator.validateNoAlertTrigger('wf-1', [{ type: 'manual' }, { type: 'alert' }]);
      expect(() => validator.finalize()).toThrow(
        /declares a "type: alert" trigger alongside the manual trigger/
      );
    });

    it('records a warning when blocking is false', () => {
      const validator = createValidator({ blockOnStructuralErrors: false });
      validator.validateNoAlertTrigger('wf-1', [{ type: 'manual' }, { type: 'alert' }]);
      const { diagnostics } = validator.finalize();
      expect(diagnostics).toEqual([
        expect.objectContaining({
          severity: 'warning',
          source: 'structural',
          message: expect.stringContaining('type: alert'),
        }),
      ]);
    });

    it('records no diagnostic when only a manual trigger is present', () => {
      const validator = createValidator();
      validator.validateNoAlertTrigger('wf-1', [{ type: 'manual' }]);
      expect(validator.finalize().diagnostics).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Common template mistakes — payload liquid presence
  // -------------------------------------------------------------------------
  describe('validatePayloadLiquidPresence', () => {
    it('records an error when Liquid is present but inputs.payload is never referenced', () => {
      const validator = createValidator({ blockOnStructuralErrors: true });
      validator.validatePayloadLiquidPresence('wf-1', YAML_LIQUID_NO_PAYLOAD_REF_IN_BODY);
      expect(() => validator.finalize()).toThrow(/templates never reference `inputs\.payload`/);
    });

    it('records no diagnostic when templates use inputs.payload', () => {
      const validator = createValidator();
      validator.validatePayloadLiquidPresence('wf-1', YAML_VALID_WITH_PAYLOAD_LIQUID);
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('records no diagnostic when templates use inputs.payload via an assign alias', () => {
      const validator = createValidator();
      validator.validatePayloadLiquidPresence('wf-1', YAML_ASSIGN_ALIAS_WITH_PAYLOAD);
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('skips the check when YAML has no Liquid expressions', () => {
      const validator = createValidator();
      validator.validatePayloadLiquidPresence('wf-1', YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF);
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('records a warning when blockOnStructuralErrors is false', () => {
      const validator = createValidator({ blockOnStructuralErrors: false });
      validator.validatePayloadLiquidPresence('wf-1', YAML_LIQUID_NO_PAYLOAD_REF_IN_BODY);
      const { diagnostics } = validator.finalize();
      expect(diagnostics).toEqual([
        expect.objectContaining({
          severity: 'warning',
          source: 'structural',
        }),
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Common template mistakes — payload field paths
  // -------------------------------------------------------------------------
  describe('validatePayloadFieldPaths', () => {
    it('records an error for nonexistent top-level payload fields', () => {
      const validator = createValidator({ blockOnStructuralErrors: true });
      validator.validatePayloadFieldPaths('wf-1', YAML_WRONG_PAYLOAD_FIELDS);
      expect(() => validator.finalize()).toThrow(/payload fields that do not exist/);
    });

    it('includes the wrong field names in the error', () => {
      const validator = createValidator();
      validator.validatePayloadFieldPaths('wf-1', YAML_WRONG_PAYLOAD_FIELDS);

      let caught: Error | undefined;
      try {
        validator.finalize();
      } catch (err) {
        caught = err as Error;
      }
      expect(caught?.message).toContain('`inputs.payload.rule`');
      expect(caught?.message).toContain('`inputs.payload.spaceId`');
    });

    it('includes valid field alternatives in the error', () => {
      const validator = createValidator();
      validator.validatePayloadFieldPaths('wf-1', YAML_WRONG_PAYLOAD_FIELDS);

      let caught: Error | undefined;
      try {
        validator.finalize();
      } catch (err) {
        caught = err as Error;
      }
      expect(caught?.message).toContain('`alerts`');
      expect(caught?.message).toContain('`rules`');
    });

    it('includes common corrections in the error', () => {
      const validator = createValidator();
      validator.validatePayloadFieldPaths('wf-1', YAML_WRONG_PAYLOAD_FIELDS);

      let caught: Error | undefined;
      try {
        validator.finalize();
      } catch (err) {
        caught = err as Error;
      }
      expect(caught?.message).toContain('inputs.payload.rules[alert.rule_id].name');
    });

    it('does not flag valid fields like alerts and rules', () => {
      const validator = createValidator();
      validator.validatePayloadFieldPaths('wf-1', YAML_VALID_WITH_PAYLOAD_LIQUID);
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('catches inputs.payload.rule.name even with a | default: filter', () => {
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
      const validator = createValidator();
      validator.validatePayloadFieldPaths('wf-1', yaml);
      expect(() => validator.finalize()).toThrow(
        /payload fields that do not exist.*`inputs\.payload\.rule`/
      );
    });

    it('records a warning when blockOnStructuralErrors is false', () => {
      const validator = createValidator({ blockOnStructuralErrors: false });
      validator.validatePayloadFieldPaths('wf-1', YAML_WRONG_PAYLOAD_FIELDS);
      const { diagnostics } = validator.finalize();
      expect(diagnostics).toEqual([
        expect.objectContaining({
          severity: 'warning',
          source: 'structural',
        }),
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Workflow validation service (variable refs)
  // -------------------------------------------------------------------------
  describe('validateWorkflowRefs', () => {
    it('surfaces error-severity diagnostics from the validation service as warnings', async () => {
      const validateWorkflow = jest.fn().mockResolvedValue({
        valid: false,
        diagnostics: [
          {
            severity: 'error',
            ruleId: 'invalidVariablePath',
            message: 'Unknown path "episodez"',
            source: 'variables',
            path: ['steps', 0, 'with', 'message'],
          },
        ],
      });
      const validator = createValidator({ validateWorkflow, request: mockRequest });

      await validator.validateWorkflowRefs('wf-1', YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF);

      expect(validateWorkflow).toHaveBeenCalledWith(
        YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF,
        'default',
        mockRequest
      );
      const { diagnostics } = validator.finalize();
      expect(diagnostics).toEqual([
        expect.objectContaining({
          destinationId: 'wf-1',
          severity: 'warning',
          source: 'workflow-validation',
          message: expect.stringContaining('invalidVariablePath'),
        }),
      ]);
    });

    it('ignores non-error diagnostics from the validation service', async () => {
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
      const validator = createValidator({ validateWorkflow, request: mockRequest });

      await validator.validateWorkflowRefs('wf-1', YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF);
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('does not call validateWorkflow when it is not provided', async () => {
      const validator = createValidator({ request: mockRequest });
      await validator.validateWorkflowRefs('wf-1', YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF);
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('does not call validateWorkflow when request is not provided', async () => {
      const validateWorkflow = jest.fn();
      const validator = createValidator({ validateWorkflow });
      await validator.validateWorkflowRefs('wf-1', YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF);
      expect(validateWorkflow).not.toHaveBeenCalled();
    });

    it('swallows errors from the validation service without adding diagnostics', async () => {
      const validateWorkflow = jest.fn().mockRejectedValue(new Error('service unavailable'));
      const validator = createValidator({ validateWorkflow, request: mockRequest });

      await validator.validateWorkflowRefs('wf-1', YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF);
      expect(validator.finalize().diagnostics).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Orchestrated workflow validation (validateWorkflow)
  // -------------------------------------------------------------------------
  describe('validateWorkflow', () => {
    it('runs all checks and collects no diagnostics for a valid workflow', async () => {
      const validator = createValidator();
      await validator.validateWorkflow('wf-1', YAML_VALID_WITH_PAYLOAD_LIQUID);
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('stops after missing manual trigger (does not run payload ref or other checks)', async () => {
      const validator = createValidator({ blockOnStructuralErrors: false });
      await validator.validateWorkflow('wf-1', YAML_ALERT_TRIGGER_ONLY);

      const { diagnostics } = validator.finalize();
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain('does not have a "manual" trigger');
    });

    it('collects multiple structural diagnostics in non-blocking mode', async () => {
      const validator = createValidator({ blockOnStructuralErrors: false });
      await validator.validateWorkflow('wf-1', YAML_DUAL_TRIGGERS_MANUAL_AND_ALERT);

      const { diagnostics } = validator.finalize();
      const sources = diagnostics.map((d) => d.message);
      expect(sources.some((m) => m.includes('type: alert'))).toBe(true);
    });

    it('throws in blocking mode for a workflow missing the manual trigger', async () => {
      const validator = createValidator({ blockOnStructuralErrors: true });
      await validator.validateWorkflow('wf-1', YAML_ALERT_TRIGGER_ONLY);
      expect(() => validator.finalize()).toThrow(ActionPolicyOperationValidationError);
    });

    it('throws in blocking mode for a workflow missing the payload $ref', async () => {
      const validator = createValidator({ blockOnStructuralErrors: true });
      await validator.validateWorkflow('wf-1', YAML_MANUAL_TRIGGER_NO_PAYLOAD_REF);
      expect(() => validator.finalize()).toThrow(/does not declare `inputs\.payload`/);
    });

    it('accepts payload required and a description alongside the $ref', async () => {
      const validator = createValidator();
      await validator.validateWorkflow('wf-1', YAML_PAYLOAD_REF_REQUIRED_WITH_DESCRIPTION);
      expect(validator.finalize().diagnostics).toEqual([]);
    });

    it('reports missing $ref and invented inputs together for a workflow without payload', async () => {
      const validator = createValidator({ blockOnStructuralErrors: true });
      await validator.validateWorkflow('wf-1', YAML_INVENTED_INPUTS_NO_PAYLOAD);

      let caught: ActionPolicyOperationValidationError | undefined;
      try {
        validator.finalize();
      } catch (err) {
        caught = err as ActionPolicyOperationValidationError;
      }
      expect(caught).toBeInstanceOf(ActionPolicyOperationValidationError);
      expect(caught?.message).toMatch(/^Destination validation failed \(2 errors\):/);
      expect(caught?.message).toContain('does not declare `inputs.payload`');
      expect(caught?.message).toContain('unexpected input properties: `alerts`, `rule_name`');
      expect(caught?.message).toContain('unexpected `required` entries: `alerts`, `rule_name`');
    });

    it('throws in blocking mode for a valid payload $ref with an extra input', async () => {
      const validator = createValidator({ blockOnStructuralErrors: true });
      await validator.validateWorkflow('wf-1', YAML_PAYLOAD_REF_WITH_EXTRA_INPUT);
      expect(() => validator.finalize()).toThrow(/unexpected input properties: `rule_name`/);
    });

    it('throws in blocking mode for a scheduled trigger alongside the manual trigger', async () => {
      const validator = createValidator({ blockOnStructuralErrors: true });
      await validator.validateWorkflow('wf-1', YAML_MANUAL_AND_SCHEDULED_TRIGGERS);
      expect(() => validator.finalize()).toThrow(/`type: scheduled`/);
    });

    it('handles malformed triggers (not a list) gracefully', async () => {
      const validator = createValidator();
      await validator.validateWorkflow('wf-1', YAML_TRIGGERS_NOT_A_LIST);
      expect(() => validator.finalize()).toThrow(/does not have a "manual" trigger/);
    });

    it('handles missing triggers field gracefully', async () => {
      const validator = createValidator();
      await validator.validateWorkflow('wf-1', YAML_NO_TRIGGERS);
      expect(() => validator.finalize()).toThrow(ActionPolicyOperationValidationError);
    });
  });

  // -------------------------------------------------------------------------
  // Finalization
  // -------------------------------------------------------------------------
  describe('finalize', () => {
    it('returns empty diagnostics when no issues found', () => {
      const validator = createValidator();
      expect(validator.finalize()).toEqual({ diagnostics: [] });
    });

    it('returns warnings without throwing', () => {
      const validator = createValidator({ blockOnStructuralErrors: false });
      validator.validateManualTrigger('wf-1', [{ type: 'alert' }]);
      const { diagnostics } = validator.finalize();
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].severity).toBe('warning');
    });

    it('throws ActionPolicyOperationValidationError when errors exist', () => {
      const validator = createValidator({ blockOnStructuralErrors: true });
      validator.validateManualTrigger('wf-1', [{ type: 'alert' }]);
      expect(() => validator.finalize()).toThrow(ActionPolicyOperationValidationError);
    });

    it('includes error and warning counts in the header', () => {
      const validator = createValidator({ blockOnStructuralErrors: true });
      validator.validateManualTrigger('wf-1', [{ type: 'alert' }]);
      validator.validateManualTrigger('wf-2', []);

      // Push a manual warning via a non-blocking sub-validator
      // The two manual-trigger errors are blocking; add a workflow-validation warning
      const warningValidator = createValidator({ blockOnStructuralErrors: true });
      warningValidator.unknownDestination('wf-a');
      warningValidator.unknownDestination('wf-b');

      expect(() => warningValidator.finalize()).toThrow(/2 errors/);
    });

    it('formats each diagnostic as a numbered line', () => {
      const validator = createValidator();
      validator.unknownDestination('wf-1');
      validator.unknownDestination('wf-2');

      let caught: Error | undefined;
      try {
        validator.finalize();
      } catch (err) {
        caught = err as Error;
      }
      expect(caught?.message).toContain('[1] [error]');
      expect(caught?.message).toContain('[2] [error]');
    });

    it('includes both errors and warnings in the thrown message', async () => {
      const validateWorkflow = jest.fn().mockResolvedValue({
        valid: false,
        diagnostics: [
          {
            severity: 'error',
            ruleId: 'invalidVariablePath',
            message: 'bad ref',
            source: 'variables',
          },
        ],
      });
      const validator = createValidator({
        blockOnStructuralErrors: true,
        validateWorkflow,
        request: mockRequest,
      });

      validator.unknownDestination('wf-missing');
      await validator.validateWorkflowRefs('wf-ok', 'some yaml');

      let caught: Error | undefined;
      try {
        validator.finalize();
      } catch (err) {
        caught = err as Error;
      }
      expect(caught?.message).toContain('[1] [error]');
      expect(caught?.message).toContain('[2] [warning]');
      expect(caught?.message).toMatch(/1 error, 1 warning/);
    });
  });

  // -------------------------------------------------------------------------
  // Aggregated error — every error path in one throw
  // -------------------------------------------------------------------------
  describe('aggregated error — every error path in one throw', () => {
    it('collects destination-resolution, structural, and workflow-validation diagnostics', async () => {
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

      const validator = createValidator({
        blockOnStructuralErrors: true,
        attachmentIndex: {
          inMemoryWorkflowIds: new Set(),
          attachmentToWorkflowId: new Map([
            ['att-email-wf', 'wf-email-real'],
            ['att-no-wfid', undefined],
          ]),
          inMemoryWorkflowIdToYaml: new Map(),
        },
        persistedWorkflowLookup: {
          getWorkflow: jest.fn(async (id: string) => {
            const store: Record<string, { id: string; yaml?: string }> = {
              'wf-alert-only': { id: 'wf-alert-only', yaml: YAML_ALERT_TRIGGER_ONLY },
              'wf-no-ref': { id: 'wf-no-ref', yaml: YAML_MANUAL_TRIGGER_NO_PAYLOAD_REF },
              'wf-wrong-ref': { id: 'wf-wrong-ref', yaml: YAML_MANUAL_TRIGGER_WITH_WRONG_REF },
              'wf-plain-payload': {
                id: 'wf-plain-payload',
                yaml: YAML_MANUAL_TRIGGER_WITH_UNRELATED_PAYLOAD,
              },
              'wf-bad-liquid': {
                id: 'wf-bad-liquid',
                yaml: YAML_MANUAL_TRIGGER_WITH_PAYLOAD_REF,
              },
            };
            return store[id] ?? null;
          }),
        },
        connectorLookup: {
          findConnectorById: jest.fn(async (id: string) =>
            id === 'conn-slack' ? { id: 'conn-slack', name: 'SRE Slack On-Call' } : null
          ),
        },
        validateWorkflow,
        request: mockRequest,
      });

      // Process all destinations through the full chain
      const destinations = [
        'att-email-wf', // attachment-ID misuse (has workflowId)
        'att-no-wfid', // attachment-ID misuse (no workflowId)
        'conn-slack', // connector ID
        'totally-unknown-999', // unknown ID
        'wf-alert-only', // missing manual trigger
        'wf-no-ref', // missing inputs.payload $ref
        'wf-wrong-ref', // wrong $ref target
        'wf-plain-payload', // plain type, no $ref
        'wf-bad-liquid', // valid structure, bad Liquid variable
      ];
      for (const id of destinations) {
        await validator.resolveDestination(id);
      }

      let caught: ActionPolicyOperationValidationError | undefined;
      try {
        validator.finalize();
      } catch (err) {
        caught = err as ActionPolicyOperationValidationError;
      }

      expect(caught).toBeInstanceOf(ActionPolicyOperationValidationError);
      const msg = caught!.message;

      expect(msg).toMatch(/^Destination validation failed \(8 errors, 4 warnings\):/);

      // destination-resolution errors
      expect(msg).toContain(
        '[1] [error] Destination ID "att-email-wf" is a workflow attachment ID'
      );
      expect(msg).toContain('The correct workflow ID for this attachment is "wf-email-real"');
      expect(msg).toContain('[2] [error] Destination ID "att-no-wfid" is a workflow attachment ID');
      expect(msg).toContain('has no workflowId');
      expect(msg).toContain(
        '[3] [error] Destination ID "conn-slack" is a connector ("SRE Slack On-Call")'
      );
      expect(msg).toContain(
        '[4] [error] Destination ID "totally-unknown-999" is not a valid workflow'
      );

      // structural errors
      expect(msg).toContain(
        '[5] [error] Workflow "wf-alert-only" does not have a "manual" trigger'
      );
      expect(msg).toContain('[6] [error] Workflow "wf-no-ref" does not declare `inputs.payload`');
      expect(msg).toContain('[7] [warning] [invalidVariablePath]');
      expect(msg).toContain(
        '[8] [error] Workflow "wf-wrong-ref" does not declare `inputs.payload`'
      );
      expect(msg).toContain('[9] [warning] [invalidVariablePath]');
      expect(msg).toContain(
        '[10] [error] Workflow "wf-plain-payload" does not declare `inputs.payload`'
      );
      expect(msg).toContain('[11] [warning] [invalidVariablePath]');
      expect(msg).toContain('[12] [warning] [invalidVariablePath]');
      expect(msg).toContain('episodez');
      expect(msg).toContain(`Referenced content: ${WORKFLOW_DISPATCH_PAYLOAD_SKILL_REF}`);
    });
  });
});
