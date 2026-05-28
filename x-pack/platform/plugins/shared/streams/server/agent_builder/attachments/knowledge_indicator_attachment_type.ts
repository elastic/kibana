/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { Logger } from '@kbn/core/server';
import {
  KI_ATTACHMENT_TYPE,
  decodeKiOriginId,
  kiAttachmentDataSchemaV1,
  type KnowledgeIndicatorAttachmentData,
} from '@kbn/streams-schema';
import type { GetScopedClients } from '../../routes/types';
import { resolveKnowledgeIndicatorAttachmentData } from '../sml/resolve_ki_attachment';
import { fingerprintKiContent, formatKiAsText } from '../sml/ki_content';

interface CreateKnowledgeIndicatorAttachmentTypeOptions {
  logger: Logger;
  getScopedClients: GetScopedClients;
}

/**
 * Server-side definition for the `knowledge_indicator` attachment type.
 *
 * Both Feature KIs and Query KIs flow through this single type, discriminated
 * by `data.kind`. The schema validation, resolve, isStale and format paths all
 * branch on `kind` so adding a third KI shape later is a localized change.
 */
export const createKnowledgeIndicatorAttachmentType = ({
  logger,
  getScopedClients,
}: CreateKnowledgeIndicatorAttachmentTypeOptions): AttachmentTypeDefinition<
  typeof KI_ATTACHMENT_TYPE,
  KnowledgeIndicatorAttachmentData
> => ({
  id: KI_ATTACHMENT_TYPE,
  isReadonly: true,
  validate: (input) => {
    const parsed = kiAttachmentDataSchemaV1.safeParse(input);
    if (parsed.success) {
      return { valid: true, data: parsed.data };
    }
    return {
      valid: false,
      error: parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; '),
    };
  },
  resolve: async (origin, context) => {
    const decoded = decodeKiOriginId(origin);
    if (!decoded) {
      logger.warn(`KI attachment resolve: unrecognized origin '${origin}'`);
      return undefined;
    }
    try {
      return await resolveKnowledgeIndicatorAttachmentData(
        decoded.kind,
        decoded.id,
        context.request,
        getScopedClients,
        logger
      );
    } catch (error) {
      logger.warn(
        `KI attachment resolve: unexpected error for origin '${origin}': ${
          (error as Error).message
        }`
      );
      return undefined;
    }
  },
  isStale: async (attachment, context) => {
    if (!attachment.origin) {
      return false;
    }
    const latest = getLatestVersion(attachment);
    if (!latest) {
      return false;
    }
    const decoded = decodeKiOriginId(attachment.origin);
    if (!decoded) {
      return false;
    }
    let live: KnowledgeIndicatorAttachmentData | undefined;
    try {
      live = await resolveKnowledgeIndicatorAttachmentData(
        decoded.kind,
        decoded.id,
        context.request,
        getScopedClients,
        logger
      );
    } catch (error) {
      logger.debug(
        `KI attachment isStale: resolve failed for origin '${attachment.origin}': ${
          (error as Error).message
        }`
      );
      return false;
    }
    if (!live) {
      // Live KI is gone (deleted, demoted, expired, excluded, or no longer
      // accessible to the caller). Surface the snapshot as outdated so the
      // user sees a resync prompt rather than a silently-stale rendering.
      return true;
    }
    // Stale iff any user-visible field changed. The same field set drives
    // chunk content and `format()`, so all three views agree on what makes
    // a KI different from another.
    return fingerprintKiContent(latest.data) !== fingerprintKiContent(live);
  },
  format: (attachment) => ({
    getRepresentation: () => ({ type: 'text', value: formatKiAsText(attachment.data) }),
  }),
  getAgentDescription: () =>
    'A `knowledge_indicator` attachment is operational knowledge about a stream — either a Feature KI (descriptive pattern with type/subtype/tags) or a Query KI (an ES|QL detection query, optionally rule-backed). Treat it as authoritative context for the referenced stream and prefer it over generic stream introspection when reasoning about that stream.',
  getTools: () => [],
});
