/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentFormatContext,
  BuiltinAttachmentBoundedTool,
} from '@kbn/agent-builder-server/attachments';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ALERTING_NAMESPACE } from '@kbn/alerting-v2-constants';
import { alertAttachmentDataSchema } from '@kbn/alerting-v2-schemas';
import { z } from '@kbn/zod/v4';
import { alertEpisodeToAlertAttachment } from '../../../../common/agent_builder/alert_mappers';
import { loadRuleMetadata } from '../../common/load_rule_metadata';
import { ensureToolPrivilege } from '../../common/unauthorized_tool_result';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { EpisodesClient } from '../../../lib/episodes_client';
import type { RulesClient } from '../../../lib/rules_client';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';

const refreshAlertSchema = z.object({});

/** Bounded tool id — unique per attachment instance when multiple alerts are present. */
export const refreshAlertToolId = (attachmentId: string): string =>
  `${ALERTING_NAMESPACE}.refresh_alert.${attachmentId}`;

export interface RefreshAlertToolParams {
  attachmentId: string;
  alertId: string;
  logger: LoggerServiceContract;
  getEpisodesClient: (context: AttachmentFormatContext) => EpisodesClient;
  getRulesClient: (context: AttachmentFormatContext) => RulesClient;
  getPrivilegeChecker: (context: {
    request: AttachmentFormatContext['request'];
  }) => PrivilegeChecker;
}

export const refreshAlertTool = ({
  attachmentId,
  alertId,
  logger,
  getEpisodesClient,
  getRulesClient,
  getPrivilegeChecker,
}: RefreshAlertToolParams): BuiltinAttachmentBoundedTool<typeof refreshAlertSchema> => ({
  id: refreshAlertToolId(attachmentId),
  type: ToolType.builtin,
  description: `Refresh platform alert "${alertId}" (attachment "${attachmentId}") with the latest status, timestamps, severity, tags, assignee, and snooze state from Elasticsearch. Call when the snapshot may be outdated or the user asks about current alert state.`,
  schema: refreshAlertSchema,
  handler: async (_args, toolContext) => {
    const unauthorized = await ensureToolPrivilege({
      privilegeChecker: getPrivilegeChecker({ request: toolContext.request }),
      feature: 'alerts',
      level: 'read',
      action: 'refresh episode',
    });
    if (unauthorized) {
      return unauthorized;
    }

    try {
      const client = getEpisodesClient({
        request: toolContext.request,
        spaceId: toolContext.spaceId,
      });
      const episode = await client.get(alertId);
      if (!episode) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Episode "${alertId}" not found`,
              },
            },
          ],
        };
      }

      const { ruleName, groupingFields } = await loadRuleMetadata(
        getRulesClient({
          request: toolContext.request,
          spaceId: toolContext.spaceId,
        }),
        episode['rule.id'],
        logger
      );

      const data = alertAttachmentDataSchema.parse(
        alertEpisodeToAlertAttachment(episode, { ruleName, groupingFields })
      );

      return {
        results: [
          {
            type: ToolResultType.other,
            data,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn({
        message: 'Failed to refresh episode',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_EPISODE_REFRESH_FAILED,
        labels: {
          episode_id: alertId,
          space_id: toolContext.spaceId,
        },
        error,
      });
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to refresh episode "${alertId}": ${message}`,
            },
          },
        ],
      };
    }
  },
});
