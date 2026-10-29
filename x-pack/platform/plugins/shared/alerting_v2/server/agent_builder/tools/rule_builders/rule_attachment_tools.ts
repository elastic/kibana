/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { lazySchema, z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { BuiltinAttachmentBoundedTool } from '@kbn/agent-builder-server/attachments';
import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import {
  applyParamsPatch,
  getRuleBuilderType,
  type RuleBuilderType,
} from '@kbn/alerting-v2-rule-builders';
import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import {
  RuleOperationValidationError,
  ruleSettingsOperationSchema,
} from '../rule_operations/operations';
import {
  loadRuleAttachment,
  saveRuleAttachment,
  summarizeRuleAttachment,
  type RuleAttachmentDraft,
} from '../rule_operations/rule_attachment';
import { applyBuilderParams } from './apply_builder_params';
import {
  describeBuilderRuleTools,
  describeConvertToCustomRuleTool,
  describeUpdateBuilderRuleTool,
} from './describe_builder';
import { MAX_SETTINGS_OPERATIONS } from './draft_builder_rule';
import { getConvertToCustomRuleToolId, getUpdateBuilderRuleToolId } from './tool_ids';
import { ruleToolErrorResult, ruleToolResult } from './tool_results';

interface RuleAttachmentToolsOptions {
  readonly attachmentId: string;
  readonly data: Partial<RuleAttachmentData>;
  readonly logger: LoggerServiceContract;
}

/** The tools a rule attachment exposes, and the guidance telling the agent how to use them. */
export interface RuleAttachmentTools {
  readonly guidance: string;
  readonly tools: BuiltinAttachmentBoundedTool[];
}

/** Reads builder params back from the rule, or `null` when the rule no longer matches the builder. */
const readBuilderParams = (
  builder: RuleBuilderType,
  { query, recovery, time_field: timeField }: Partial<RuleAttachmentData>
): unknown =>
  query ? builder.parse({ query, ...(recovery ? { recovery } : {}), time_field: timeField }) : null;

/**
 * Loads the attachment for an attachment-bound tool. Tools are chosen at the start of a
 * run, so the attachment may have changed since: fail when it is no longer this builder's rule.
 */
const loadBuilderRuleAttachment = (
  attachments: ToolHandlerContext['attachments'],
  attachmentId: string,
  builderType: string
): RuleAttachmentDraft => {
  const draft = loadRuleAttachment(attachments, attachmentId);
  if (draft.isNew) {
    throw new RuleOperationValidationError(
      `Rule attachment "${attachmentId}" no longer exists in this conversation.`
    );
  }
  if (draft.data.metadata?.builder?.type !== builderType) {
    throw new RuleOperationValidationError(
      `Rule attachment "${attachmentId}" is no longer a ${builderType} rule. Edit it with the tools its attachment lists.`
    );
  }
  return draft;
};

const createUpdateBuilderRuleSchema = (builder: RuleBuilderType) =>
  lazySchema(() =>
    z.object({
      params: builder.paramsPatchSchema.optional(),
      settings: z
        .array(ruleSettingsOperationSchema)
        .max(MAX_SETTINGS_OPERATIONS)
        .optional()
        .describe('Ordered operations for the settings every rule shares.'),
    })
  );

const updateBuilderRuleTool = (
  builder: RuleBuilderType,
  attachmentId: string,
  logger: LoggerServiceContract
): BuiltinAttachmentBoundedTool<ReturnType<typeof createUpdateBuilderRuleSchema>> => ({
  id: getUpdateBuilderRuleToolId(builder, attachmentId),
  type: ToolType.builtin,
  description: describeUpdateBuilderRuleTool(builder, attachmentId),
  schema: createUpdateBuilderRuleSchema(builder),
  handler: async (
    { params, settings = [] },
    { attachments, esClient, savedObjectsClient, spaceId }
  ) => {
    let ruleId: string | undefined;
    try {
      if (params === undefined && settings.length === 0) {
        throw new RuleOperationValidationError('Send `params`, `settings` or both.');
      }

      const draft = loadBuilderRuleAttachment(attachments, attachmentId, builder.type);
      ruleId = draft.origin ?? draft.data.id;

      const currentParams = readBuilderParams(builder, draft.data);
      if (currentParams === null) {
        throw new RuleOperationValidationError(
          `The ${
            builder.title
          } params can't be read back from rule attachment "${attachmentId}". Call \`${getConvertToCustomRuleToolId(
            attachmentId
          )}\` to edit it as a custom ES|QL rule.`
        );
      }

      const result = await applyBuilderParams({
        builder,
        current: draft.data,
        params: applyParamsPatch(currentParams, params),
        settings,
        isNew: false,
        esClient,
        savedObjectsClient,
      });
      const attachment = await saveRuleAttachment(attachments, draft, result.data);

      logger.debug({
        message: () => `${builder.type} rule attachment updated`,
        labels: { space_id: spaceId, ...(ruleId != null ? { rule_id: ruleId } : {}) },
      });

      return ruleToolResult({
        ...summarizeRuleAttachment(attachment, result.data),
        params: result.params,
        ...(result.queryColumns ? { queryColumns: result.queryColumns } : {}),
        ...(result.warnings ? { warnings: result.warnings } : {}),
      });
    } catch (error) {
      return ruleToolErrorResult({
        error,
        logger,
        toolName: `update_${builder.type}_rule`,
        code: ALERTING_LOG_CODES.AGENT_BUILDER_UPDATE_BUILDER_RULE_FAILED,
        spaceId,
        ruleId,
        metadata: { ruleAttachmentId: attachmentId, params, settings },
      });
    }
  },
});

const convertToCustomRuleSchema = lazySchema(() => z.object({}));

const convertToCustomRuleTool = (
  builderType: string,
  builderTitle: string,
  attachmentId: string,
  logger: LoggerServiceContract
): BuiltinAttachmentBoundedTool<typeof convertToCustomRuleSchema> => ({
  id: getConvertToCustomRuleToolId(attachmentId),
  type: ToolType.builtin,
  description: describeConvertToCustomRuleTool(builderTitle, attachmentId),
  schema: convertToCustomRuleSchema,
  handler: async (_input, { attachments, spaceId }) => {
    let ruleId: string | undefined;
    try {
      const draft = loadBuilderRuleAttachment(attachments, attachmentId, builderType);
      ruleId = draft.origin ?? draft.data.id;

      // The write API rejects a query change on a rule that still carries `metadata.builder`.
      const data: Partial<RuleAttachmentData> = omit(draft.data, 'metadata.builder');
      const attachment = await saveRuleAttachment(attachments, draft, data);

      logger.debug({
        message: () => `${builderType} rule attachment converted to a custom rule`,
        labels: { space_id: spaceId, ...(ruleId != null ? { rule_id: ruleId } : {}) },
      });

      return ruleToolResult({
        ...summarizeRuleAttachment(attachment, data),
        message: `The rule is now a custom ES|QL rule. Edit it with \`${ALERTING_TOOL_IDS.draftCustomRule}\` and \`ruleAttachmentId: "${attachmentId}"\`.`,
      });
    } catch (error) {
      return ruleToolErrorResult({
        error,
        logger,
        toolName: 'convert_to_custom_rule',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_CONVERT_TO_CUSTOM_RULE_FAILED,
        spaceId,
        ruleId,
        metadata: { ruleAttachmentId: attachmentId },
      });
    }
  },
});

const describeCustomRuleTools = (attachmentId: string): string =>
  `Custom ES|QL rule. Edit it with \`${ALERTING_TOOL_IDS.draftCustomRule}\` and \`ruleAttachmentId: "${attachmentId}"\`.`;

/**
 * Chooses a rule attachment's tools from the builder that authored it. Builder rules get
 * a params-based update tool and a conversion tool; custom ES|QL rules keep using
 * `draft_custom_rule`. Never throws: Agent Builder drops an attachment's tools silently
 * when this fails, so failures degrade to the conversion tool alone.
 */
export const getRuleAttachmentTools = ({
  attachmentId,
  data,
  logger,
}: RuleAttachmentToolsOptions): RuleAttachmentTools => {
  const builderType = data.metadata?.builder?.type;
  if (!builderType) {
    return { guidance: describeCustomRuleTools(attachmentId), tools: [] };
  }

  const builder = getRuleBuilderType(builderType);
  const convertTool = convertToCustomRuleTool(
    builderType,
    builder?.title ?? builderType,
    attachmentId,
    logger
  );

  let params: unknown = null;
  if (builder) {
    try {
      params = readBuilderParams(builder, data);
    } catch (error) {
      logger.warn({
        message: 'Failed to read rule builder params for the rule attachment tools',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_RULE_BUILDER_PARSE_FAILED,
        labels: data.id ? { rule_id: data.id } : undefined,
        error,
      });
    }
  }

  if (!builder || params === null) {
    return {
      guidance: `Authored with the "${builderType}" rule builder, but its params can't be read back from the rule. To edit it, call \`${convertTool.id}\` to make it a custom ES|QL rule.`,
      tools: [convertTool],
    };
  }

  return {
    guidance: `${describeBuilderRuleTools(builder, attachmentId)}\nCurrent ${
      builder.title
    } params: ${JSON.stringify(params)}`,
    tools: [updateBuilderRuleTool(builder, attachmentId, logger), convertTool],
  };
};
