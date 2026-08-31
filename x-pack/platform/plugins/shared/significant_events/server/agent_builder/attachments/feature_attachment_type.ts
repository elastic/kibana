/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentResolveContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Logger } from '@kbn/core/server';
import { featureSchema, type Feature } from '@kbn/significant-events-schema';
import { decodeFeatureAttachmentOrigin, KI_FEATURE_ATTACHMENT_TYPE } from '../../../common';
import type { GetScopedClients } from '../../routes/types';

interface CreateSignificantEventFeatureAttachmentTypeOptions {
  logger: Logger;
  getScopedClients: GetScopedClients;
}

export const formatFeatureAsText = (feature: Feature): string => {
  const title = feature.title ?? feature.id;
  return [
    `Knowledge Indicator feature "${title}"`,
    `Feature ID: ${feature.id}`,
    `Stream: ${feature.stream_name}`,
    `Type: ${feature.type}${feature.subtype ? ` (${feature.subtype})` : ''}`,
    feature.confidence > 0 ? `Confidence: ${feature.confidence}%` : undefined,
    feature.description ? `Description: ${feature.description}` : undefined,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
};

export const createSignificantEventFeatureAttachmentType = ({
  logger,
  getScopedClients,
}: CreateSignificantEventFeatureAttachmentTypeOptions): AttachmentTypeDefinition<
  typeof KI_FEATURE_ATTACHMENT_TYPE,
  Feature
> => {
  const fetchFeature = async (
    origin: string,
    context: AttachmentResolveContext
  ): Promise<Feature | undefined> => {
    const decoded = decodeFeatureAttachmentOrigin(origin);
    if (!decoded) {
      return undefined;
    }

    const { getKnowledgeIndicatorClient } = await getScopedClients({ request: context.request });
    const kiClient = await getKnowledgeIndicatorClient();

    try {
      return await kiClient.getFeature(decoded.streamName, decoded.featureId);
    } catch (error) {
      logger.warn(`Failed to resolve feature attachment for origin "${origin}": ${String(error)}`);
      return undefined;
    }
  };

  return {
    id: KI_FEATURE_ATTACHMENT_TYPE,
    isReadonly: true,
    validate: (input) => {
      const parseResult = featureSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    resolve: async (origin, context) => fetchFeature(origin, context),
    isStale: async (
      attachment: VersionedAttachment<typeof KI_FEATURE_ATTACHMENT_TYPE, Feature>,
      context
    ): Promise<boolean> => {
      if (!attachment.origin) {
        return false;
      }

      const latestVersion = getLatestVersion(attachment);
      if (!latestVersion) {
        return false;
      }

      try {
        const latestFeature = await fetchFeature(attachment.origin, context);
        return !latestFeature || latestVersion.data.uuid !== latestFeature.uuid;
      } catch (error) {
        logger.warn(
          `Failed to check staleness for feature attachment "${attachment.origin}": ${String(
            error
          )}`
        );
        return false;
      }
    },
    format: (attachment) => ({
      getRepresentation: () => ({
        type: 'text',
        value: formatFeatureAsText(attachment.data),
      }),
    }),
    getAgentDescription: () =>
      'A Significant Events knowledge indicator feature attachment represents a discovered entity or operational pattern on a stream. Use it as authoritative context about the attached feature when answering questions.',
    getTools: () => [],
  };
};
