/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformAttackDiscoveryAlertToApi } from '.';
import type { AttackDiscoveryAlert } from '../../schemas/attack_discovery/attack_discovery_alert.gen';
import type { AttackDiscoveryApiAlert } from '../../schemas/attack_discovery/attack_discovery_api_alert.gen';

describe('transformAttackDiscoveryAlertToApi', () => {
  it('returns a snake_cased object when given a full internal object', () => {
    const internal: AttackDiscoveryAlert = {
      alertIds: ['alert-1', 'alert-2'],
      alertRuleUuid: 'rule-uuid',
      alertWorkflowStatus: 'open',
      connectorId: 'connector-id',
      connectorName: 'connector-name',
      alertStart: '2025-09-16T00:00:00.000Z',
      alertUpdatedAt: '2025-09-16T01:00:00.000Z',
      alertUpdatedByUserId: 'user-1',
      alertUpdatedByUserName: 'User One',
      alertWorkflowStatusUpdatedAt: '2025-09-16T01:30:00.000Z',
      detailsMarkdown: 'details',
      entitySummaryMarkdown: 'summary',
      generationUuid: 'gen-uuid',
      id: 'internal-id',
      mitreAttackTactics: ['TA0001'],
      replacements: { foo: 'bar' },
      riskScore: 42,
      summaryMarkdown: 'summary-md',
      timestamp: '2025-09-16T02:00:00.000Z',
      title: 'Alert Title',
      userId: 'user-1',
      userName: 'User One',
      users: [
        { id: 'user-1', name: 'User One' },
        { id: 'user-2', name: 'User Two' },
      ],
    };

    const expected: AttackDiscoveryApiAlert = {
      alert_ids: ['alert-1', 'alert-2'],
      alert_rule_uuid: 'rule-uuid',
      alert_workflow_status: 'open',
      connector_id: 'connector-id',
      connector_name: 'connector-name',
      alert_start: '2025-09-16T00:00:00.000Z',
      alert_updated_at: '2025-09-16T01:00:00.000Z',
      alert_updated_by_user_id: 'user-1',
      alert_updated_by_user_name: 'User One',
      alert_workflow_status_updated_at: '2025-09-16T01:30:00.000Z',
      details_markdown: 'details',
      entity_summary_markdown: 'summary',
      generation_uuid: 'gen-uuid',
      id: 'internal-id',
      mitre_attack_tactics: ['TA0001'],
      replacements: { foo: 'bar' },
      risk_score: 42,
      summary_markdown: 'summary-md',
      timestamp: '2025-09-16T02:00:00.000Z',
      title: 'Alert Title',
      user_id: 'user-1',
      user_name: 'User One',
      users: [
        { id: 'user-1', name: 'User One' },
        { id: 'user-2', name: 'User Two' },
      ],
    };

    expect(transformAttackDiscoveryAlertToApi(internal)).toEqual(expected);
  });

  it('returns expected shape when optional fields are missing', () => {
    const minimal: AttackDiscoveryAlert = {
      id: 'internal-id',
      alertIds: [],
      connectorId: '',
      connectorName: '',
      detailsMarkdown: '',
      generationUuid: '',
      summaryMarkdown: '',
      timestamp: '',
      title: '',
      // All other fields are optional and omitted
    };

    const expected: AttackDiscoveryApiAlert = {
      id: 'internal-id',
      alert_ids: [],
      connector_id: '',
      connector_name: '',
      details_markdown: '',
      generation_uuid: '',
      summary_markdown: '',
      timestamp: '',
      title: '',
      // All other fields are optional and should be undefined
      alert_rule_uuid: undefined,
      alert_workflow_status: undefined,
      alert_start: undefined,
      alert_updated_at: undefined,
      alert_updated_by_user_id: undefined,
      alert_updated_by_user_name: undefined,
      alert_workflow_status_updated_at: undefined,
      entity_summary_markdown: undefined,
      mitre_attack_tactics: undefined,
      replacements: undefined,
      risk_score: undefined,
      user_id: undefined,
      user_name: undefined,
      users: undefined,
    };

    expect(transformAttackDiscoveryAlertToApi(minimal)).toEqual(expected);
  });
});
