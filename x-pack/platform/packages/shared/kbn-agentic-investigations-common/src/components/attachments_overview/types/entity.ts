/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { encode as risonEncode } from '@kbn/rison';
import { ATTACHMENTS_OVERVIEW_LABELS } from '../translations';
import { ESQL_QUERY_KEY, escapeKqlPhrase, getVisibleAttachments } from './url_utils';

const TYPE_ENTITY = 'security.entity';

interface EntityEntry {
  key: string;
  term: string;
}

const extractEntitiesFromData = (data: Record<string, unknown>): EntityEntry[] => {
  if (data.entities != null && Array.isArray(data.entities)) {
    return (data.entities as Array<Record<string, unknown>>).map((entity) => {
      const key =
        (entity.entityStoreId as string | undefined) ??
        `${entity.identifierType}:${entity.identifier}`;
      const term =
        (entity.entityStoreId as string | undefined) ??
        (entity.identifier as string | undefined) ??
        key;
      return { key, term };
    });
  }
  if (data.identifierType != null) {
    const key =
      (data.entityStoreId as string | undefined) ?? `${data.identifierType}:${data.identifier}`;
    const term =
      (data.entityStoreId as string | undefined) ?? (data.identifier as string | undefined) ?? key;
    return [{ key, term }];
  }
  return [];
};

/**
 * Extracts entity keys from `security.entity` attachments, builds the entity analytics
 * page URL with a KQL `cspq` filter, and returns the row label + href.
 * Returns `undefined` when no valid entities are found.
 */
export const getEntityRow = (
  attachments: readonly VersionedAttachment[],
  getSecurityAppUrl: (path: string) => string
): { label: string; href: string } | undefined => {
  const active = getVisibleAttachments(attachments);
  const entityKeySet = new Set<string>();
  const entityTerms: string[] = [];

  for (const attachment of active) {
    if (attachment.type !== TYPE_ENTITY) continue;
    const data = getLatestVersion(attachment)?.data as Record<string, unknown> | undefined;
    if (!data) continue;

    for (const { key, term } of extractEntitiesFromData(data)) {
      if (!entityKeySet.has(key)) {
        entityKeySet.add(key);
        entityTerms.push(term);
      }
    }
  }

  if (entityKeySet.size === 0) return undefined;

  const query = entityTerms
    .map(
      (term) => `entity.id: "${escapeKqlPhrase(term)}" or entity.name: "${escapeKqlPhrase(term)}"`
    )
    .join(' or ');

  const cspq = risonEncode({ filters: [], pageIndex: 0, query: { language: 'kuery', query } });
  const params = new URLSearchParams();
  params.set(ESQL_QUERY_KEY, cspq);

  return {
    label: ATTACHMENTS_OVERVIEW_LABELS.entities(entityKeySet.size),
    href: getSecurityAppUrl(`/entity_analytics_home_page?${params.toString()}`),
  };
};
