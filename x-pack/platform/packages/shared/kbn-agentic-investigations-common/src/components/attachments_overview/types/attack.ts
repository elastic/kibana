/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENTS_OVERVIEW_LABELS } from '../translations';
import {
  buildAlertOrAttackParams,
  firstCreatedAt,
  lastUpdatedAt,
  getVisibleAttachments,
  minDate,
  maxDate,
} from './url_utils';

const TYPE_ATTACK = 'security.attack_discovery';

/**
 * Extracts attack discovery ids from `security.attack_discovery` attachments,
 * builds the Security attacks page URL, and returns the row label + href.
 * Returns `undefined` when no valid attack ids are found.
 */
export const getAttackRow = (
  attachments: readonly VersionedAttachment[],
  getSecurityAppUrl: (path: string) => string
): { label: string; href: string } | undefined => {
  const visible = getVisibleAttachments(attachments);
  const attackIdSet = new Set<string>();
  let createdAt: string | undefined;
  let updatedAt: string | undefined;

  for (const attachment of visible) {
    if (attachment.type !== TYPE_ATTACK) continue;
    const data = getLatestVersion(attachment)?.data as Record<string, unknown> | undefined;
    // data.id is the persisted document _id; fall back to origin (also the doc _id).
    const id = (data?.id as string | undefined) ?? (attachment.origin as string | undefined);
    if (id && !attackIdSet.has(id)) {
      attackIdSet.add(id);
      createdAt = minDate(createdAt, firstCreatedAt(attachment));
      updatedAt = maxDate(updatedAt, lastUpdatedAt(attachment));
    }
  }

  if (attackIdSet.size === 0 || !createdAt || !updatedAt) return undefined;

  const ids = [...attackIdSet];
  const params = buildAlertOrAttackParams(ids, createdAt, updatedAt);
  return {
    label: ATTACHMENTS_OVERVIEW_LABELS.attacks(ids.length),
    href: getSecurityAppUrl(`/attacks?${params.toString()}`),
  };
};
