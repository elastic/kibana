/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_CASE_IDS,
  ALERT_DURATION,
  ALERT_END,
  ALERT_FLAPPING,
  ALERT_GROUPING,
  ALERT_INSTANCE_ID,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_NAME,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_SEVERITY,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { flattenObject } from '@kbn/object-utils';
import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '../../queries/episodes_query';

const normalizeV1Severity = (severity: string | undefined): string | null => {
  if (severity == null) return null;
  return severity.toLowerCase();
};

/**
 * Minimum `_source` projection for `mapClassicAlertToEpisode`.
 * Passing this to the RAC find request avoids transferring the full document.
 */
export const CLASSIC_ALERT_EPISODE_SOURCE_FIELDS = [
  TIMESTAMP,
  ALERT_UUID,
  ALERT_INSTANCE_ID,
  ALERT_START,
  ALERT_END,
  ALERT_DURATION,
  ALERT_STATUS,
  ALERT_REASON,
  ALERT_RULE_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_CONSUMER,
  ALERT_SEVERITY,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
  ALERT_CASE_IDS,
  ALERT_GROUPING,
  ALERT_FLAPPING,
  ALERT_MAINTENANCE_WINDOW_IDS,
] as const;

export interface ClassicAlertSource {
  [TIMESTAMP]: string;
  [ALERT_UUID]: string;
  [ALERT_INSTANCE_ID]?: string;
  [ALERT_START]?: string;
  [ALERT_END]?: string;
  [ALERT_DURATION]?: number;
  [ALERT_STATUS]?: string;
  [ALERT_REASON]?: string;
  [ALERT_RULE_UUID]?: string;
  [ALERT_RULE_NAME]?: string;
  [ALERT_RULE_CATEGORY]?: string;
  [ALERT_RULE_TYPE_ID]?: string;
  [ALERT_SEVERITY]?: string;
  [ALERT_WORKFLOW_STATUS]?: string;
  [ALERT_WORKFLOW_TAGS]?: string | string[];
  [ALERT_CASE_IDS]?: string | string[];
  [ALERT_GROUPING]?: Record<string, unknown>;
  [ALERT_FLAPPING]?: boolean;
  [ALERT_MAINTENANCE_WINDOW_IDS]?: string | string[];
}

export interface ClassicAlertActionContext {
  readonly index: string;
  readonly alertUuid: string;
  readonly instanceId: string | undefined;
  readonly ruleId: string;
  readonly ruleTypeId: string | undefined;
  readonly workflowStatus: string | undefined;
  readonly workflowTags: string[];
  readonly caseIds: string[];
}

const asStringArray = (value: string | string[] | undefined): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
};

/**
 * Maps the classic `kibana.alert.status` values onto the v2 episode status enum
 * so the shared status cell renderer can display them. Only `active` maps to the
 * active episode status; `recovered` / `untracked` (and anything else) map to
 * `inactive`.
 */
export const mapClassicStatusToEpisodeStatus = (status: string | undefined): AlertEpisodeStatus =>
  status === ALERT_STATUS_ACTIVE ? ALERT_EPISODE_STATUS.ACTIVE : ALERT_EPISODE_STATUS.INACTIVE;

/**
 * Reshapes a classic alert `_source` document into the v2 `AlertEpisode` row
 * shape so it can be merged into the v2 alerting (episodes) table. Each classic alert
 * maps to one episode. v2-only fields (ack / assignee / snooze / episode data) are
 * emitted as `null`. Capability flags are set to `false`.
 */
export const mapClassicAlertToEpisode = (
  source: ClassicAlertSource,
  index: string
): AlertEpisode => {
  const { [TIMESTAMP]: timestamp, [ALERT_UUID]: uuid } = source;
  const start = source[ALERT_START];
  const end = source[ALERT_END];
  const lastTimestamp = end ?? timestamp;

  const durationUs = source[ALERT_DURATION];
  const durationMs =
    durationUs != null
      ? Math.round(durationUs / 1000)
      : start
      ? Math.max(0, new Date(lastTimestamp).getTime() - new Date(start).getTime())
      : 0;

  const workflowTags = asStringArray(source[ALERT_WORKFLOW_TAGS]);
  const grouping = source[ALERT_GROUPING];

  const actionContext: ClassicAlertActionContext = {
    index,
    alertUuid: uuid,
    instanceId: source[ALERT_INSTANCE_ID],
    ruleId: source[ALERT_RULE_UUID] ?? '',
    ruleTypeId: source[ALERT_RULE_TYPE_ID],
    workflowStatus: source[ALERT_WORKFLOW_STATUS],
    workflowTags,
    caseIds: asStringArray(source[ALERT_CASE_IDS]),
  };

  return {
    '@timestamp': timestamp,
    'episode.id': uuid,
    'episode.status': mapClassicStatusToEpisodeStatus(source[ALERT_STATUS]),
    'rule.id': source[ALERT_RULE_UUID] ?? '',
    'rule.name': source[ALERT_RULE_NAME],
    group_hash: uuid,
    first_timestamp: start ?? timestamp,
    last_timestamp: lastTimestamp,
    duration: durationMs,
    triggered_at: start,
    last_assignee_uid: null,
    last_tags: workflowTags,
    last_ack_action: source[ALERT_WORKFLOW_STATUS] === 'acknowledged' ? 'ack' : null,
    episode_data: null,
    severity: normalizeV1Severity(source[ALERT_SEVERITY]),
    rule_category: source[ALERT_RULE_CATEGORY],
    reason: source[ALERT_REASON],
    supports_actions: false,
    supports_timeline: false,
    source_action_context: actionContext,
    source_grouping: grouping ? flattenObject(grouping) : undefined,
    is_flapping: source[ALERT_FLAPPING] ?? false,
    maintenance_window_ids: asStringArray(source[ALERT_MAINTENANCE_WINDOW_IDS]),
  };
};
