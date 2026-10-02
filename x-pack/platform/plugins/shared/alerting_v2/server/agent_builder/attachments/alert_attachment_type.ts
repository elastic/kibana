/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentTypeDefinition,
  AttachmentFormatContext,
  AttachmentResolveContext,
} from '@kbn/agent-builder-server/attachments';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { RULE_MANAGEMENT_SKILL_ID } from '@kbn/alerting-v2-constants';
import {
  ALERT_ATTACHMENT_TYPE,
  alertAttachmentDataSchema,
  type AlertAttachmentData,
} from '@kbn/alerting-v2-schemas';
import { alertEpisodeToAlertAttachment } from '@kbn/alerting-v2-utils';
import { ALERTING_LOG_CODES } from '../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../lib/services/logger_service/logger_service';
import type { EpisodesClient } from '../../lib/episodes_client';
import type { RulesClient } from '../../lib/rules_client';
import { loadRuleMetadata } from '../common/load_rule_metadata';
import type { PrivilegeChecker } from '../../lib/services/privilege_checker/privilege_checker';
import { getRuleTool, getRuleToolId } from '../tools/get_rule';
import { getRuleEventsTool, getRuleEventsToolId } from '../tools/get_rule_events';
import { refreshAlertTool, refreshAlertToolId } from '../tools/refresh_alert';

interface CreateAlertAttachmentTypeOptions {
  logger: LoggerServiceContract;
  getEpisodesClient: (context: AttachmentFormatContext) => EpisodesClient;
  getRulesClient: (context: AttachmentFormatContext) => RulesClient;
  getPrivilegeChecker: (context: {
    request: AttachmentResolveContext['request'];
  }) => PrivilegeChecker;
}

const parseAlertAttachmentData = (input: unknown) => alertAttachmentDataSchema.safeParse(input);

const formatAlertDescription = ({
  attachmentId,
  data,
  refreshToolId,
  getRuleToolId: ruleToolId,
  ruleEventsToolId,
}: {
  attachmentId: string;
  data: AlertAttachmentData;
  refreshToolId: string;
  getRuleToolId: string;
  ruleEventsToolId: string;
}): string => {
  const lines = [
    'This is a platform alert, not a Security/SIEM detection alert.',
    'Do not use the security alert-analysis skill, detection-rule tools, or .alerts-security.alerts-* indices.',
    `Platform alert "${data['alert.id']}" (alertAttachment.id: "${attachmentId}")`,
    `Status: ${data['alert.status']}`,
  ];

  if (data['alert.label']) {
    lines.push(`Alert label: ${data['alert.label']}`);
  }
  lines.push(
    `Rule ID: ${data['rule.id']}`,
    `Group hash: ${data.group_hash}`,
    `First seen: ${data.first_timestamp}`,
    `Last seen: ${data.last_timestamp}`,
    `Duration (ms): ${data.duration}`
  );

  if (data.triggered_at) {
    lines.push(`Triggered at: ${data.triggered_at}`);
  }
  if (data.severity) {
    lines.push(`Severity: ${data.severity}`);
  }
  if (data.last_ack_action) {
    lines.push(`Ack: ${data.last_ack_action}`);
  }
  if (data.last_assignee_uid) {
    lines.push(`Assignee: ${data.last_assignee_uid}`);
  }
  if (data.last_snooze_action) {
    lines.push(`Snooze: ${data.last_snooze_action}`);
  }
  if (data.snoozed_until) {
    lines.push(`Snoozed until: ${data.snoozed_until}`);
  }
  if (data.last_tags?.length) {
    lines.push(`Tags: ${data.last_tags.join(', ')}`);
  }

  lines.push(
    `Use the ${refreshToolId} tool to refresh this alert with the latest state from Elasticsearch.`
  );
  lines.push(
    `Use the ${ruleToolId} tool to fetch the alert rule associated with this alert, then query that rule's source indices. To modify that rule, or create a new rule, load the ${RULE_MANAGEMENT_SKILL_ID} skill.`
  );
  lines.push(
    `Use the ${ruleEventsToolId} tool to fetch this alert's rule events from .rule-events, including timestamp, episode.status, severity, source, group_hash, and event data. Call it with no arguments; pass start/end only to narrow the window. It returns at most 100 rows (oldest first). If truncated is true, call again with start set to the last event's @timestamp and the same end; skip the overlapping first row. Do not retry the same window. If truncated is still true for a very small window, stop and use the rows you have.`
  );

  return lines.join('\n');
};

export const createAlertAttachmentType = ({
  logger,
  getEpisodesClient,
  getRulesClient,
  getPrivilegeChecker,
}: CreateAlertAttachmentTypeOptions): AttachmentTypeDefinition<
  typeof ALERT_ATTACHMENT_TYPE,
  AlertAttachmentData
> => {
  const attachmentLogger = logger.withLabels({ attachment_type: ALERT_ATTACHMENT_TYPE });

  return {
    id: ALERT_ATTACHMENT_TYPE,

    validate: (input) => {
      const result = parseAlertAttachmentData(input);
      if (result.success) {
        return { valid: true, data: result.data };
      }
      return { valid: false, error: result.error.message };
    },

    resolve: async (
      alertId: string,
      context: AttachmentResolveContext
    ): Promise<AlertAttachmentData | undefined> => {
      try {
        const privilegeChecker = getPrivilegeChecker({ request: context.request });
        const canRead = await privilegeChecker.canRead('alerts');
        if (!canRead) {
          attachmentLogger.debug({
            message: 'Unauthorized to resolve episode attachment',
            labels: { episode_id: alertId, space_id: context.spaceId },
          });
          return undefined;
        }

        const episode = await getEpisodesClient(context).get(alertId);
        if (!episode) {
          return undefined;
        }

        const { ruleName, groupingFields } = await loadRuleMetadata(
          getRulesClient(context),
          episode['rule.id'],
          attachmentLogger
        );

        return alertAttachmentDataSchema.parse(
          alertEpisodeToAlertAttachment(episode, { ruleName, groupingFields })
        );
      } catch (error) {
        attachmentLogger.warn({
          message: 'Failed to resolve episode attachment',
          code: ALERTING_LOG_CODES.AGENT_BUILDER_EPISODE_RESOLVE_FAILED,
          labels: { episode_id: alertId, space_id: context.spaceId },
          error,
        });
        return undefined;
      }
    },

    isStale: async (
      attachment: VersionedAttachment<typeof ALERT_ATTACHMENT_TYPE, AlertAttachmentData>,
      context: AttachmentResolveContext
    ): Promise<boolean> => {
      if (!attachment.origin) {
        return false;
      }
      const latestVersion = getLatestVersion(attachment);
      if (!latestVersion) return true;
      try {
        const episode = await getEpisodesClient(context).get(attachment.origin);
        if (!episode) {
          return false;
        }
        const snapshot = parseAlertAttachmentData(latestVersion.data);
        const snapshotStatus = snapshot.success ? snapshot.data['alert.status'] : undefined;
        return episode['episode.status'] !== snapshotStatus;
      } catch (error) {
        attachmentLogger.warn({
          message: 'Failed to check episode attachment staleness',
          code: ALERTING_LOG_CODES.AGENT_BUILDER_EPISODE_STALENESS_CHECK_FAILED,
          labels: { episode_id: attachment.origin, space_id: context.spaceId },
          error,
        });
        return false;
      }
    },

    format: (attachment) => {
      const parsed = parseAlertAttachmentData(attachment.data);
      const data = parsed.success ? parsed.data : attachment.data;
      const alertId = attachment.origin ?? data['alert.id'];
      const ruleId = data['rule.id'];
      const refreshToolId = refreshAlertToolId(attachment.id);
      const ruleToolId = getRuleToolId(attachment.id);
      const ruleEventsToolId = getRuleEventsToolId(attachment.id);

      return {
        getRepresentation: () => ({
          type: 'text',
          value: formatAlertDescription({
            attachmentId: attachment.id,
            data,
            refreshToolId,
            getRuleToolId: ruleToolId,
            ruleEventsToolId,
          }),
        }),
        getBoundedTools: () => [
          refreshAlertTool({
            attachmentId: attachment.id,
            alertId,
            logger: attachmentLogger,
            getEpisodesClient,
            getRulesClient,
            getPrivilegeChecker,
          }),
          getRuleTool({
            attachmentId: attachment.id,
            alertId,
            ruleId,
            logger: attachmentLogger,
            getRulesClient,
            getPrivilegeChecker,
          }),
          getRuleEventsTool({
            attachmentId: attachment.id,
            episodeId: alertId,
            logger: attachmentLogger,
            getEpisodesClient,
            getPrivilegeChecker,
          }),
        ],
      };
    },

    getAgentDescription: () =>
      `A platform alert attachment — a stateful lifecycle of related alert events for a platform alert rule and group. This is not a Security/SIEM detection alert: do not use the security alert-analysis skill, detection-rule tools, or .alerts-security.alerts-* indices. It is read-only snapshot context. Use the attachment-scoped refresh_alert tool when you need the latest alert state, get_rule to fetch the associated platform alert rule and its source indices, and get_rule_events to fetch the alert's underlying rule events. To create, explain, or modify that rule, load the ${RULE_MANAGEMENT_SKILL_ID} skill.`,

    isReadonly: true,

    getTools: () => [],
  };
};
