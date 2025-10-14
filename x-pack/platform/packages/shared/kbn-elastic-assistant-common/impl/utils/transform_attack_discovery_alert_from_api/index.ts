/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryAlert } from '../../schemas/attack_discovery/attack_discovery_alert.gen';
import type { AttackDiscoveryApiAlert } from '../../schemas/attack_discovery/attack_discovery_api_alert.gen';

export const transformAttackDiscoveryAlertFromApi = (
  api: AttackDiscoveryApiAlert
): AttackDiscoveryAlert => {
  return {
    alertIds: api.alert_ids,
    alertRuleUuid: api.alert_rule_uuid,
    alertWorkflowStatus: api.alert_workflow_status,
    connectorId: api.connector_id,
    connectorName: api.connector_name,
    alertStart: api.alert_start,
    alertUpdatedAt: api.alert_updated_at,
    alertUpdatedByUserId: api.alert_updated_by_user_id,
    alertUpdatedByUserName: api.alert_updated_by_user_name,
    alertWorkflowStatusUpdatedAt: api.alert_workflow_status_updated_at,
    detailsMarkdown: api.details_markdown,
    entitySummaryMarkdown: api.entity_summary_markdown,
    generationUuid: api.generation_uuid,
    id: api.id,
    mitreAttackTactics: api.mitre_attack_tactics,
    replacements: api.replacements,
    riskScore: api.risk_score,
    summaryMarkdown: api.summary_markdown,
    timestamp: api.timestamp,
    title: api.title,
    userId: api.user_id,
    userName: api.user_name,
    users: api.users,
  };
};
