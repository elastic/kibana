/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { Feature } from '@kbn/significant-events-schema';

export const KI_FEATURE_ATTACHMENT_TYPE = 'platform.ki_feature' as const;

export type KiFeatureAttachment = Attachment<typeof KI_FEATURE_ATTACHMENT_TYPE, Feature>;

export type PendingKiFeatureAttachment = AttachmentInput<
  typeof KI_FEATURE_ATTACHMENT_TYPE,
  Feature
>;

const FEATURE_ATTACHMENT_ORIGIN_SEPARATOR = '::';

export const encodeFeatureAttachmentOrigin = (streamName: string, featureId: string): string =>
  `${streamName}${FEATURE_ATTACHMENT_ORIGIN_SEPARATOR}${featureId}`;

export const decodeFeatureAttachmentOrigin = (
  origin: string
): { streamName: string; featureId: string } | undefined => {
  const separatorIndex = origin.indexOf(FEATURE_ATTACHMENT_ORIGIN_SEPARATOR);
  if (separatorIndex <= 0 || separatorIndex === origin.length - 1) {
    return undefined;
  }

  return {
    streamName: origin.slice(0, separatorIndex),
    featureId: origin.slice(separatorIndex + FEATURE_ATTACHMENT_ORIGIN_SEPARATOR.length),
  };
};
