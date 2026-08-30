/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import type { Case } from '../../../common/types/domain';
import { isAlertAttachmentType, toStringArray } from '../../../common/utils/attachments';

/** Returns the value as a plain-object record, or undefined for arrays, null, and primitives. */
const isRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);
export const getRecord = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? value : undefined;

/**
 * Finds the Elasticsearch index for an alert identified by `alertId` among a case's alert attachments.
 * Handles both the legacy v1 shape (`alertId` + `index` parallel arrays) and the unified-v2
 * shape (`attachmentId` + `metadata.index`).
 */
export const findAlertIndex = (
  alertId: string,
  comments: NonNullable<Case['comments']>
): string | undefined => {
  for (const comment of comments) {
    if (isAlertAttachmentType(comment.type)) {
      if ('alertId' in comment) {
        // Legacy v1: alertId and index are parallel arrays.
        const ids = toStringArray(comment.alertId);
        const indices = toStringArray((comment as Record<string, unknown>).index ?? []);
        const pos = ids.indexOf(alertId);
        if (pos !== -1) {
          return indices[pos];
        }
      } else if ('attachmentId' in comment) {
        // Unified v2: id is attachmentId, index lives in metadata.index.
        const ids = toStringArray(comment.attachmentId);
        if (ids.includes(alertId)) {
          const meta = getRecord((comment as Record<string, unknown>).metadata);
          const metaIndices = meta ? toStringArray(meta.index) : [];
          const pos = ids.indexOf(alertId);
          return metaIndices[pos];
        }
      }
    }
  }
  return undefined;
};
