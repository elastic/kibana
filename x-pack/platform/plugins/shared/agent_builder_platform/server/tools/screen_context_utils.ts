/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { ScreenContextAttachmentData } from '@kbn/agent-builder-common/attachments';
import type { TimeRange } from '@kbn/agent-builder-common';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';

const DEFAULT_TIME_RANGE: TimeRange = { from: 'now-24h', to: 'now' };

/**
 * Extracts the time range from the active screen context attachment, if present.
 */
export function getTimeRangeFromScreenContext(
  attachments: AttachmentStateManager
): TimeRange | undefined {
  const activeAttachments = attachments.getActive();
  const screenContext = activeAttachments.find((a) => a.type === AttachmentType.screenContext);
  if (!screenContext) {
    return undefined;
  }
  const latestVersion = getLatestVersion(screenContext);
  const data = latestVersion?.data as ScreenContextAttachmentData | undefined;
  return data?.time_range;
}

/**
 * Resolves the time range to use, with fallback chain:
 * explicit param → screen context attachment → last 24 hours.
 */
export function resolveTimeRange(
  attachments: AttachmentStateManager,
  explicit?: TimeRange
): TimeRange {
  return explicit ?? getTimeRangeFromScreenContext(attachments) ?? DEFAULT_TIME_RANGE;
}
