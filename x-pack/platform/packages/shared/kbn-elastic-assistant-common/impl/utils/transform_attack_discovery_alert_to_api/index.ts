/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryAlert } from '../../schemas/attack_discovery/attack_discovery_alert.gen';
import type { AttackDiscoveryApiAlert } from '../../schemas/attack_discovery/attack_discovery_api_alert.gen';

export const transformAttackDiscoveryAlertToApi = (
  attackDiscoveryAlert: AttackDiscoveryAlert
): AttackDiscoveryApiAlert => ({
  alert_ids: attackDiscoveryAlert.alertIds,
  alert_rule_uuid: attackDiscoveryAlert.alertRuleUuid,
  alert_workflow_status: attackDiscoveryAlert.alertWorkflowStatus,
  connector_id: attackDiscoveryAlert.connectorId,
  connector_name: attackDiscoveryAlert.connectorName,
  alert_start: attackDiscoveryAlert.alertStart,
  alert_updated_at: attackDiscoveryAlert.alertUpdatedAt,
  alert_updated_by_user_id: attackDiscoveryAlert.alertUpdatedByUserId,
  alert_updated_by_user_name: attackDiscoveryAlert.alertUpdatedByUserName,
  alert_workflow_status_updated_at: attackDiscoveryAlert.alertWorkflowStatusUpdatedAt,
  details_markdown: attackDiscoveryAlert.detailsMarkdown,
  entity_summary_markdown: attackDiscoveryAlert.entitySummaryMarkdown,
  generation_uuid: attackDiscoveryAlert.generationUuid,
  id: attackDiscoveryAlert.id,
  mitre_attack_tactics: attackDiscoveryAlert.mitreAttackTactics,
  replacements: attackDiscoveryAlert.replacements,
  risk_score: attackDiscoveryAlert.riskScore,
  summary_markdown: attackDiscoveryAlert.summaryMarkdown,
  timestamp: attackDiscoveryAlert.timestamp,
  title: attackDiscoveryAlert.title,
  user_id: attackDiscoveryAlert.userId,
  user_name: attackDiscoveryAlert.userName,
  users: attackDiscoveryAlert.users,
});
