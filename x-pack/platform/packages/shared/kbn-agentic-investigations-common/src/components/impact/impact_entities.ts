/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getActiveAttachments, getLatestVersion } from '@kbn/agent-builder-common/attachments';

/**
 * Spelled out rather than imported: this package cannot depend on the agentic investigations
 * plugin, which owns the same id (`IMPACT_ATTACHMENT_TYPE`).
 */
export const IMPACT_ATTACHMENT_TYPE = 'investigation_impact';

/** One entity from the latest `investigation_impact` attachment version. */
export interface ImpactEntityView {
  id: string;
  name?: string;
  type?: string;
  featureId?: string;
  streamName?: string;
}

/** Opens an entity-store Impact row. Knowledge-indicator rows are not passed here. */
export type OpenImpactEntity = (entity: ImpactEntityView) => void;

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const readEntity = (value: unknown): ImpactEntityView | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const id = readString(record.id);
  if (!id) {
    return undefined;
  }

  return {
    id,
    name: readString(record.name),
    type: readString(record.type),
    featureId: readString(record.featureId),
    streamName: readString(record.streamName),
  };
};

/**
 * A Nightshift Knowledge Indicator row carries both a feature id and a stream name. That flyout
 * is not part of Flyout V2, so the row stays plain text.
 */
export const isKnowledgeIndicatorImpact = (entity: ImpactEntityView): boolean =>
  Boolean(entity.featureId && entity.streamName);

/** Entity-store rows are links only when a host supplied a handler. */
export const isImpactEntityLink = (
  entity: ImpactEntityView,
  onOpenImpactEntity?: OpenImpactEntity
): boolean => !isKnowledgeIndicatorImpact(entity) && onOpenImpactEntity !== undefined;

const versionTime = (attachment: VersionedAttachment): number => {
  const version = getLatestVersion(attachment) ?? attachment.versions[0];
  const time = Date.parse(version?.created_at ?? '');
  return Number.isNaN(time) ? 0 : time;
};

/**
 * Entities from the newest visible `investigation_impact` attachment, using that attachment's
 * latest version. Hidden and deleted attachments are skipped. Entries without an id are dropped.
 */
export const selectImpactEntities = (
  attachments: VersionedAttachment[] | undefined
): ImpactEntityView[] => {
  if (!attachments?.length) {
    return [];
  }

  const visible = getActiveAttachments(attachments).filter(
    (attachment) => !attachment.hidden && attachment.type === IMPACT_ATTACHMENT_TYPE
  );
  const latest = [...visible].sort((a, b) => versionTime(b) - versionTime(a))[0];
  if (!latest) {
    return [];
  }

  const data = (getLatestVersion(latest) ?? latest.versions[0])?.data;
  if (!data || typeof data !== 'object' || !('entities' in data)) {
    return [];
  }

  const entities = (data as { entities?: unknown }).entities;
  if (!Array.isArray(entities)) {
    return [];
  }

  const seen = new Set<string>();
  const result: ImpactEntityView[] = [];
  for (const entry of entities) {
    const entity = readEntity(entry);
    if (!entity || seen.has(entity.id)) {
      continue;
    }
    seen.add(entity.id);
    result.push(entity);
  }
  return result;
};
