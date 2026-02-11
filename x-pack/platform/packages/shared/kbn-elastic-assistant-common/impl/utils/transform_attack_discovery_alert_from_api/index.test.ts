/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformAttackDiscoveryAlertFromApi } from '.';
import type { AttackDiscoveryAlert } from '../../schemas/attack_discovery/attack_discovery_alert.gen';
import type { AttackDiscoveryApiAlert } from '../../schemas/attack_discovery/attack_discovery_api_alert.gen';

describe('transformAttackDiscoveryAlertFromApi', () => {
  const fullApiMock: AttackDiscoveryApiAlert = {
    alert_ids: ['alert-1', 'alert-2'],
    alert_rule_uuid: 'rule-uuid',
    alert_workflow_status: 'acknowledged',
    alert_start: '2025-01-01T00:00:00.000Z',
    alert_updated_at: '2025-01-02T00:00:00.000Z',
    alert_updated_by_user_id: 'updater-id',
    alert_updated_by_user_name: 'updater-name',
    alert_workflow_status_updated_at: '2025-01-03T00:00:00.000Z',
    connector_id: 'connector-1',
    connector_name: 'Connector One',
    details_markdown: 'details',
    entity_summary_markdown: 'entity summary',
    generation_uuid: 'gen-1',
    id: 'discovery-1',
    mitre_attack_tactics: ['Initial Access'],
    replacements: {
      uuid1: 'replacement-1',
      uuid2: 'replacement-2',
    },
    risk_score: 42,
    summary_markdown: 'summary',
    timestamp: '2025-01-01T00:00:01.000Z',
    title: 'Title',
    user_id: 'creator-id',
    user_name: 'creator-name',
    users: [{ id: 'user-1', name: 'User One' }],
  };

  it('returns a camelCased object when given a full API object', () => {
    const result: AttackDiscoveryAlert = transformAttackDiscoveryAlertFromApi(fullApiMock);
    const expected: AttackDiscoveryAlert = {
      alertIds: ['alert-1', 'alert-2'],
      alertRuleUuid: 'rule-uuid',
      alertWorkflowStatus: 'acknowledged',
      alertStart: '2025-01-01T00:00:00.000Z',
      alertUpdatedAt: '2025-01-02T00:00:00.000Z',
      alertUpdatedByUserId: 'updater-id',
      alertUpdatedByUserName: 'updater-name',
      alertWorkflowStatusUpdatedAt: '2025-01-03T00:00:00.000Z',
      connectorId: 'connector-1',
      connectorName: 'Connector One',
      detailsMarkdown: 'details',
      entitySummaryMarkdown: 'entity summary',
      generationUuid: 'gen-1',
      id: 'discovery-1',
      mitreAttackTactics: ['Initial Access'],
      replacements: {
        uuid1: 'replacement-1',
        uuid2: 'replacement-2',
      },
      riskScore: 42,
      summaryMarkdown: 'summary',
      timestamp: '2025-01-01T00:00:01.000Z',
      title: 'Title',
      userId: 'creator-id',
      userName: 'creator-name',
      users: [{ id: 'user-1', name: 'User One' }],
    };
    expect(result).toEqual(expected);
  });

  it('returns expected shape when optional fields are missing', () => {
    const onlyRequiredFields: AttackDiscoveryApiAlert = {
      alert_ids: [],
      connector_id: 'c2',
      connector_name: 'c2 name',
      details_markdown: '',
      generation_uuid: 'g2',
      id: 'i2',
      summary_markdown: '',
      timestamp: '2025-01-01T00:00:00.000Z',
      title: 't2',
      // all optionals omitted
    };

    const result: AttackDiscoveryAlert = transformAttackDiscoveryAlertFromApi(onlyRequiredFields);
    const expected: AttackDiscoveryAlert = {
      alertIds: [],
      alertRuleUuid: undefined,
      alertWorkflowStatus: undefined,
      alertStart: undefined,
      alertUpdatedAt: undefined,
      alertUpdatedByUserId: undefined,
      alertUpdatedByUserName: undefined,
      alertWorkflowStatusUpdatedAt: undefined,
      connectorId: 'c2',
      connectorName: 'c2 name',
      detailsMarkdown: '',
      entitySummaryMarkdown: undefined,
      generationUuid: 'g2',
      id: 'i2',
      mitreAttackTactics: undefined,
      replacements: undefined,
      riskScore: undefined,
      summaryMarkdown: '',
      timestamp: '2025-01-01T00:00:00.000Z',
      title: 't2',
      userId: undefined,
      userName: undefined,
      users: undefined,
    };
    expect(result).toEqual(expected);
  });
});
