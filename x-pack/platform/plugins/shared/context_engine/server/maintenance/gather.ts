/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import {
  ABOUT_RELATIONSHIP_TYPE,
  DREAMING_MEMORY_KI_TYPES,
  LAST_SEEN_AT_ATTRIBUTE,
  RELATIONSHIP_KEY_ATTRIBUTE,
  RELATIONSHIP_KI_TYPE,
} from '../../common/dreaming';
import {
  MAINTENANCE_BATCH_SIZE,
  MAX_MAINTENANCE_ABOUT_FACTS,
  MAX_MAINTENANCE_BATCHES,
  MAX_MAINTENANCE_LISTED_CHANGES,
  MAX_MAINTENANCE_REMAINING_MEMORIES,
  type GatherMaintenanceOutput,
  type MaintenanceBatch,
  type MaintenanceChange,
  type MaintenanceItem,
  type MaintenanceRelationship,
  type MaintenanceReviewItem,
  type MaintenanceReviewReason,
} from '../../common/step_types/gather_maintenance';
import { isKiDeleted } from '../ai_indices/ki_revision';
import { isPersonEdited } from '../ai_indices/ki_write';
import { kindOf, occurrencesOf, type DreamedKi } from '../dreaming/dreamed_ki';
import { kiUri } from '../dreaming/ids';
import {
  audienceKeyOf,
  derivedPermissions,
  isVisibleInSpace,
  samePermissions,
} from '../dreaming/permissions';
import type { MaintenanceReader } from './reader';
import { citedMemoryKiIds, sourceVerdictOf } from './sources';

const OPEN_AUDIENCE = 'open';

export interface GatherOptions {
  spaceId: string;
  /** This workflow's writer URI: items it wrote last are not reviewed again as changed. */
  writerUri: string;
  neighbors: number;
  sweepSize: number;
  since: string;
  afterId?: string;
  sweepAfterId?: string;
}

interface ParsedRelationship extends MaintenanceRelationship {
  ki: DreamedKi;
}

export const parseRelationship = (ki: DreamedKi): ParsedRelationship | undefined => {
  const key = ki.attributes?.[RELATIONSHIP_KEY_ATTRIBUTE];
  const parts = typeof key === 'string' ? key.split('|') : [];
  if (ki.type !== RELATIONSHIP_KI_TYPE || parts.length !== 3) {
    return undefined;
  }
  const [from, relation, to] = parts;
  return {
    ki,
    id: ki.id,
    from,
    relation,
    to,
    ...(ki.description !== undefined && { description: ki.description }),
  };
};

export const toMaintenanceItem = (ki: DreamedKi): MaintenanceItem => {
  const lastSeenAt = ki.attributes?.[LAST_SEEN_AT_ATTRIBUTE];
  return {
    id: ki.id,
    kind: kindOf(ki) ?? 'fact',
    type: ki.type,
    title: ki.title,
    ...(ki.description !== undefined && { description: ki.description }),
    ...(ki.content !== undefined && { content: ki.content }),
    occurrences: occurrencesOf(ki),
    ...(typeof lastSeenAt === 'string' && { last_seen_at: lastSeenAt }),
    ...(isPersonEdited(ki) && { person_edited: true }),
  };
};

export const audienceOf = (ki: Pick<DreamedKi, 'permissions'>): string =>
  audienceKeyOf([ki.permissions]) ?? OPEN_AUDIENCE;

const isMemory = (ki: DreamedKi): boolean => DREAMING_MEMORY_KI_TYPES.includes(ki.type);

const newestFirst = (a: DreamedKi, b: DreamedKi): number =>
  Date.parse(String(b.updated_at ?? '')) - Date.parse(String(a.updated_at ?? ''));

/** Collects what memory maintenance reviews in one run, as batches for the model and fixes. */
export const gatherMaintenance = async (
  reader: MaintenanceReader,
  { spaceId, writerUri, neighbors, sweepSize, since, afterId, sweepAfterId }: GatherOptions
): Promise<GatherMaintenanceOutput> => {
  const isLiveItem = (ki: DreamedKi | undefined): ki is DreamedKi =>
    ki !== undefined &&
    kindOf(ki) !== undefined &&
    !isKiDeleted(ki) &&
    isVisibleInSpace(ki.permissions, spaceId);

  const review = new Map<string, { ki: DreamedKi; reasons: Set<MaintenanceReviewReason> }>();
  const add = (ki: DreamedKi, reason: MaintenanceReviewReason) => {
    const entry = review.get(ki.id) ?? { ki, reasons: new Set() };
    entry.reasons.add(reason);
    review.set(ki.id, entry);
  };

  const changed = await reader.changedSince(since, afterId);
  const changedItems = changed.kis.filter(
    (ki) => isLiveItem(ki) && ki.governance?.provenance?.updated_by?.uri !== writerUri
  );
  changedItems.forEach((ki) => add(ki, 'changed'));

  const deletedMemoryUris = changed.kis
    .filter((ki) => isMemory(ki) && isKiDeleted(ki))
    .map((ki) => kiUri(ki.id));
  const citingDeleted = deletedMemoryUris.length
    ? await reader.citing(deletedMemoryUris, 'items')
    : [];
  citingDeleted.filter(isLiveItem).forEach((ki) => add(ki, 'lost_sources'));

  const changedFactIds = new Set(
    changed.kis.filter((ki) => kindOf(ki) === 'fact').map(({ id }) => id)
  );
  const factLinks = changedFactIds.size
    ? await reader.citing([...changedFactIds].map(kiUri), 'relationships')
    : [];
  const aboutLinks = (kis: readonly DreamedKi[]) =>
    kis
      .map(parseRelationship)
      .filter((link): link is ParsedRelationship => link?.relation === ABOUT_RELATIONSHIP_TYPE);
  const aboutEntityIds = new Set([
    ...aboutLinks(changed.kis).map(({ to }) => to),
    ...aboutLinks(factLinks)
      .filter(({ from }) => changedFactIds.has(from))
      .map(({ to }) => to),
  ]);
  const aboutEntities = aboutEntityIds.size
    ? await reader.latestByIds([...aboutEntityIds])
    : new Map<string, DreamedKi>();
  [...aboutEntities.values()]
    .filter((ki) => isLiveItem(ki) && kindOf(ki) === 'entity')
    .forEach((ki) => add(ki, 'about_facts_changed'));

  const swept = await reader.sweep(sweepAfterId, sweepSize);
  swept.filter(isLiveItem).forEach((ki) => add(ki, 'sweep'));

  const fixes: MaintenanceChange[] = [];
  const needsReview: MaintenanceChange[] = [];
  const memories = await reader.latestByIds(
    [...review.values()].flatMap(({ ki }) => citedMemoryKiIds(ki))
  );
  const visibleMemoryOf = (memoryId: string): DreamedKi | undefined => {
    const memory = memories.get(memoryId);
    return memory && typeof memory.content === 'string' && isVisibleInSpace(memory.permissions, spaceId)
      ? memory
      : undefined;
  };
  const rewrites = new Map<
    string,
    Required<Pick<MaintenanceReviewItem, 'lost_source_ids' | 'remaining_memories'>>
  >();
  for (const { ki } of [...review.values()]) {
    const verdict = sourceVerdictOf(ki, memories);
    if (verdict.verdict === 'intact') {
      continue;
    }
    if (verdict.verdict === 'tombstone') {
      fixes.push({ id: ki.id, change: 'tombstoned', reason: verdict.reason });
      review.delete(ki.id);
      continue;
    }
    const remaining =
      verdict.verdict === 'rewrite'
        ? verdict.remainingIds
            .map(visibleMemoryOf)
            .filter((memory): memory is DreamedKi => memory !== undefined)
            .slice(0, MAX_MAINTENANCE_REMAINING_MEMORIES)
        : [];
    if (verdict.verdict === 'rewrite' && remaining.length > 0) {
      rewrites.set(ki.id, {
        lost_source_ids: verdict.lostIds,
        remaining_memories: remaining.map(({ id, title, content }) => ({
          id,
          ...(title && { title }),
          content: content ?? '',
        })),
      });
      continue;
    }
    needsReview.push({
      id: ki.id,
      change: 'needs_review',
      reason:
        verdict.verdict === 'needs_review'
          ? verdict.reason
          : 'Some of the memories it came from were deleted, and those that remain are not visible in this space.',
    });
    review.delete(ki.id);
  }

  const reviewed = [...review.values()].map(({ ki }) => ki);
  const similar = reviewed.length
    ? await reader.similar(reviewed, neighbors)
    : new Map<string, DreamedKi[]>();
  const neighborsOf = new Map<string, DreamedKi[]>(
    reviewed.map((ki) => [
      ki.id,
      (similar.get(ki.id) ?? [])
        .filter(
          (neighbor) =>
            neighbor.id !== ki.id &&
            isLiveItem(neighbor) &&
            kindOf(neighbor) === kindOf(ki) &&
            samePermissions(neighbor.permissions, ki.permissions)
        )
        .slice(0, neighbors),
    ])
  );

  const known = new Map<string, DreamedKi>();
  for (const ki of [...reviewed, ...[...neighborsOf.values()].flat()]) {
    known.set(ki.id, ki);
  }
  const links = known.size
    ? (await reader.citing([...known.keys()].map(kiUri), 'relationships'))
        .filter((ki) => !isKiDeleted(ki) && isVisibleInSpace(ki.permissions, spaceId))
        .map(parseRelationship)
        .filter((link): link is ParsedRelationship => link !== undefined)
    : [];

  const unknownEnds = links
    .flatMap(({ from, to }) => [from, to])
    .filter((endId) => !known.has(endId));
  for (const [endId, end] of await reader.latestByIds(unknownEnds)) {
    known.set(endId, end);
  }

  const brokenLinks = new Set<string>();
  for (const link of links) {
    const from = known.get(link.from);
    const to = known.get(link.to);
    if (!isLiveItem(from) || !isLiveItem(to)) {
      fixes.push({ id: link.id, change: 'tombstoned', reason: 'It links an item that was deleted.' });
      brokenLinks.add(link.id);
    } else if (
      !samePermissions(
        link.ki.permissions,
        derivedPermissions([from.permissions, to.permissions], spaceId)
      )
    ) {
      fixes.push({
        id: link.id,
        change: 'tombstoned',
        reason: 'Its permissions differ from those of the items it links.',
      });
      brokenLinks.add(link.id);
    }
  }
  const liveLinks = links.filter(({ id }) => !brokenLinks.has(id));

  const aboutFactIdsOf = new Map<string, string[]>();
  for (const link of liveLinks) {
    if (link.relation === ABOUT_RELATIONSHIP_TYPE && review.has(link.to)) {
      aboutFactIdsOf.set(link.to, [...(aboutFactIdsOf.get(link.to) ?? []), link.from]);
    }
  }
  for (const [entityId, factIds] of aboutFactIdsOf) {
    aboutFactIdsOf.set(
      entityId,
      factIds
        .map((factId) => known.get(factId))
        .filter(isLiveItem)
        .sort(newestFirst)
        .slice(0, MAX_MAINTENANCE_ABOUT_FACTS)
        .map(({ id }) => id)
    );
  }

  const toReviewItem = (ki: DreamedKi): MaintenanceReviewItem => {
    const neighborIds = (neighborsOf.get(ki.id) ?? []).map(({ id }) => id);
    const aboutFactIds = aboutFactIdsOf.get(ki.id) ?? [];
    return {
      ...toMaintenanceItem(ki),
      reasons: [...(review.get(ki.id)?.reasons ?? [])],
      ...(neighborIds.length > 0 && { neighbor_ids: neighborIds }),
      ...(aboutFactIds.length > 0 && { about_fact_ids: aboutFactIds }),
      ...rewrites.get(ki.id),
    };
  };

  const byAudience = new Map<string, DreamedKi[]>();
  for (const ki of reviewed) {
    const audience = audienceOf(ki);
    byAudience.set(audience, [...(byAudience.get(audience) ?? []), ki]);
  }
  const batches: MaintenanceBatch[] = [...byAudience].flatMap(([audience, kis]) =>
    chunk(kis, MAINTENANCE_BATCH_SIZE).map((part) => {
      const ids = new Set(part.map(({ id }) => id));
      const neighborIds = new Set(
        part.flatMap((ki) => (neighborsOf.get(ki.id) ?? []).map(({ id }) => id))
      );
      const shown = new Set([...ids, ...neighborIds]);
      const factIds = new Set(part.flatMap((ki) => aboutFactIdsOf.get(ki.id) ?? []));
      return {
        audience,
        items: part.map(toReviewItem),
        neighbors: [...neighborIds]
          .filter((id) => !ids.has(id))
          .flatMap((id) => {
            const ki = known.get(id);
            return ki ? [toMaintenanceItem(ki)] : [];
          }),
        about_facts: [...factIds]
          .filter((id) => !shown.has(id))
          .flatMap((id) => {
            const ki = known.get(id);
            return ki ? [toMaintenanceItem(ki)] : [];
          }),
        relationships: liveLinks
          .filter(({ from, to }) => shown.has(from) || shown.has(to))
          .map(({ ki: _ki, ...link }) => link),
      };
    })
  );
  const kept = batches.slice(0, MAX_MAINTENANCE_BATCHES);

  const countOf = (reason: MaintenanceReviewReason) =>
    [...review.values()].filter(({ reasons }) => reasons.has(reason)).length;
  const lastSwept = swept.at(-1)?.id;

  return {
    reviewed: kept.reduce((total, { items }) => total + items.length, 0),
    batches: kept,
    fixes: fixes.slice(0, MAX_MAINTENANCE_LISTED_CHANGES),
    needs_review: needsReview.slice(0, MAX_MAINTENANCE_LISTED_CHANGES),
    counts: {
      changed: countOf('changed'),
      lost_sources: countOf('lost_sources'),
      about_facts_changed: countOf('about_facts_changed'),
      sweep: countOf('sweep'),
    },
    resume_from: changed.resume?.from ?? '',
    resume_after_id: changed.resume?.afterId ?? '',
    sweep_after_id: swept.length === sweepSize && lastSwept !== undefined ? lastSwept : '',
  };
};
