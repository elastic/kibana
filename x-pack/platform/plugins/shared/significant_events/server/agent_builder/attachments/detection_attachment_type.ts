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
import type { Detection, LifecycleDetection } from '@kbn/significant-events-schema';
import { SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE } from '../../../common/significant_event_detection_attachment';
import { lifecycleDetectionAttachmentSchema } from '../../../common/significant_event_detection_attachment_schema';
import type { GetScopedClients } from '../../routes/types';

interface CreateSignificantEventDetectionAttachmentTypeOptions {
  logger: Logger;
  getScopedClients: GetScopedClients;
}

const toLifecycleDetection = (detection: Detection): LifecycleDetection | undefined => {
  if (!detection.rule_name) {
    return undefined;
  }

  return {
    '@timestamp': detection['@timestamp'],
    detection_id: detection.detection_id,
    rule_name: detection.rule_name,
    rule_uuid: detection.rule_uuid,
    stream_name: detection.stream_name,
    change_point_type: detection.change_point_type,
  };
};

export const formatDetectionAsText = (detection: LifecycleDetection): string => {
  return [
    `Significant Events detection "${detection.rule_name}"`,
    `Detection ID: ${detection.detection_id}`,
    `Stream: ${detection.stream_name}`,
    `Change point: ${detection.change_point_type}`,
    `Timestamp: ${detection['@timestamp']}`,
  ].join('\n');
};

export const createSignificantEventDetectionAttachmentType = ({
  logger,
  getScopedClients,
}: CreateSignificantEventDetectionAttachmentTypeOptions): AttachmentTypeDefinition<
  typeof SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
  LifecycleDetection
> => {
  const fetchDetection = async (
    detectionId: string,
    context: AttachmentResolveContext
  ): Promise<LifecycleDetection | undefined> => {
    const { getDetectionClient } = await getScopedClients({ request: context.request });

    try {
      const { hits } = await getDetectionClient().findById(detectionId);
      const latestHit = hits.at(-1);
      return latestHit ? toLifecycleDetection(latestHit) : undefined;
    } catch (error) {
      logger.warn(
        `Failed to resolve detection attachment for origin "${detectionId}": ${String(error)}`
      );
      return undefined;
    }
  };

  return {
    id: SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
    isReadonly: true,
    validate: (input) => {
      const parseResult = lifecycleDetectionAttachmentSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    resolve: async (origin, context) => fetchDetection(origin, context),
    isStale: async (
      attachment: VersionedAttachment<
        typeof SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
        LifecycleDetection
      >,
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
        const latestDetection = await fetchDetection(attachment.origin, context);
        if (!latestDetection) {
          return true;
        }

        return (
          latestVersion.data['@timestamp'] !== latestDetection['@timestamp'] ||
          latestVersion.data.change_point_type !== latestDetection.change_point_type
        );
      } catch (error) {
        logger.warn(
          `Failed to check staleness for detection attachment "${attachment.origin}": ${String(
            error
          )}`
        );
        return false;
      }
    },
    format: (attachment) => ({
      getRepresentation: () => ({
        type: 'text',
        value: formatDetectionAsText(attachment.data),
      }),
    }),
    getAgentDescription: () =>
      'A Significant Events detection attachment represents a change-point observation from an alerting rule on a stream. Use it as authoritative context about the attached detection when answering questions.',
    getTools: () => [],
  };
};
