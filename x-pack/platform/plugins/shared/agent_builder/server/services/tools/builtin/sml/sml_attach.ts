/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { decodeSmlLinkId, parseSmlEntryId } from '@kbn/agent-builder-sml-plugin/server';
import type { SmlToolsOptions } from './types';

const smlAttachSchema = z.object({
  entry_ids: z
    .array(z.string())
    .min(1)
    .max(50)
    .describe(
      'One or more entry_id values exactly as returned by sml_search, or the path after sml:// in a user # reference link.'
    ),
});

/**
 * Creates the sml_attach tool.
 * Converts SML search results into conversation attachments.
 */
export const createSmlAttachTool = ({
  getAgentBuilderSml,
}: SmlToolsOptions): BuiltinToolDefinition<typeof smlAttachSchema> => ({
  id: platformCoreTools.smlAttach,
  type: ToolType.builtin,
  description:
    'Attach assets found by sml_search to the conversation. ' +
    'When the user references an SML asset with #, their message contains a link like [#label](sml://ENTRY_ID) and the item is attached to the conversation automatically; call this tool for such a link only if the item is not already attached. ' +
    'Pass one or more entry_id strings exactly as returned by sml_search or taken from those sml:// links. ' +
    'Entry id follows the format: attachment_type:origin_id:uuid and could be referenced by sml://{attachment_type}/{origin_id}. ' +
    'Each entry is resolved into a full conversation attachment (e.g. a Lens visualization). ' +
    'Entries that cannot be resolved return individual errors without failing the entire call.',
  schema: smlAttachSchema,
  tags: ['sml', 'attachment'],
  excludeFromMcp: true,
  annotations: {
    title: 'Attach SML Item',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  availability: {
    cacheMode: 'global',
    // SML lives inside Agent Builder, so it requires only the Agent Builder
    // experimental flag.
    handler: async ({ uiSettings }) => {
      const experimentalEnabled = await uiSettings.get<boolean>(
        AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID
      );
      return experimentalEnabled
        ? { status: 'available' }
        : {
            status: 'unavailable',
            reason: 'SML features require Agent Builder experimental features to be enabled',
          };
    },
  },
  handler: async ({ entry_ids: entryIds }, context) => {
    const agentBuilderSml = getAgentBuilderSml();
    const { spaceId, savedObjectsClient, request, attachments, esClient, logger } = context;

    const resolvedItems = await agentBuilderSml.resolveSmlAttachItems({
      // The entry ids of `sml://` links are URL-encoded.
      entryIds: entryIds.map(decodeSmlLinkId),
      esClient,
      request,
      spaceId,
      savedObjectsClient,
      logger,
    });

    const results = await Promise.all(
      resolvedItems.map(async (r) => {
        if (!r.success) {
          return createErrorResult({
            message: r.message,
            metadata: { entry_id: r.entry_id, attachment_type: r.attachment_type },
          });
        }

        // The item may already be attached, for example by the user referencing it with `#`.
        // Referenced items have the bare origin id as origin; some types set a `type://id` uri.
        const { type, origin } = r.attachment;
        const originId = parseSmlEntryId(r.entry_id)?.originId;
        const existing = attachments
          .getActive()
          .find(
            (a) =>
              a.type === type &&
              a.origin !== undefined &&
              (a.origin === origin || a.origin === originId)
          );
        if (existing) {
          return {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              success: true,
              attachment_id: existing.id,
              attachment_type: type,
              message: `Attachment '${existing.id}' of type '${type}' already exists for SML item '${r.entry_id}'; it was not added again`,
            },
          };
        }

        const added = await attachments.add(r.attachment, ATTACHMENT_REF_ACTOR.agent);

        return {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            success: true,
            attachment_id: added.id,
            attachment_type: r.attachment.type,
            message: `Attachment '${added.id}' of type '${r.attachment.type}' created from SML item '${r.entry_id}'`,
          },
        };
      })
    );

    return { results };
  },
});
