/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ABOUT_RELATIONSHIP_TYPE,
  DREAMING_MEMORY_KI_TYPES,
  LAST_SEEN_AT_ATTRIBUTE,
  RELATIONSHIP_KEY_ATTRIBUTE,
  RELATIONSHIP_KI_TYPE,
} from '../../common/dreaming';
import {
  MAINTENANCE_BATCH_SIZE,
  MAX_BATCH_RELATED,
  MAX_MAINTENANCE_ABOUT_FACTS,
  MAX_MAINTENANCE_BATCHES,
  MAX_MAINTENANCE_LISTED_CHANGES,
  MAX_MAINTENANCE_REMAINING_MEMORIES,
  MIN_MAINTENANCE_TOMBSTONES,
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
  /** The share of reviewed facts and entities one run may tombstone, from 0 to 1. */
  maxTombstoneShare: number;
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
  {
    spaceId,
    writerUri,
    neighbors,
    sweepSize,
    maxTombstoneShare,
    since,
    afterId,
    sweepAfterId,
  }: GatherOptions
): Promise<GatherMaintenanceOutput> => {
  const isLiveItem = (ki: DreamedKi | undefined): ki is DreamedKi =>
    ki !== undefined &&
    kindOf(ki) !== undefined &&
    !isKiDeleted(ki) &&
    isVisibleInSpace(ki.permissions, spaceId);

  const review = new Map<string, { ki: DreamedKi; reasons: Set<MaintenanceReviewReason> }>();
  const causeOf = new Map<string, number>();
  const add = (ki: DreamedKi, reason: MaintenanceReviewReason, cause?: number) => {
    const entry = review.get(ki.id) ?? { ki, reasons: new Set() };
    entry.reasons.add(reason);
    review.set(ki.id, entry);
    if (cause !== undefined) {
      causeOf.set(ki.id, Math.min(causeOf.get(ki.id) ?? cause, cause));
    }
  };

  const changed = await reader.changedSince(since, afterId);
  const positionOf = new Map(changed.kis.map(({ id }, position) => [id, position]));
  changed.kis.forEach((ki, position) => {
    if (isLiveItem(ki) && ki.governance?.provenance?.updated_by?.uri !== writerUri) {
      add(ki, 'changed', position);
    }
  });

  const deletedMemoryIds = changed.kis
    .filter((ki) => isMemory(ki) && isKiDeleted(ki))
    .map(({ id }) => id);
  const citingDeleted = deletedMemoryIds.length
    ? await reader.citing(deletedMemoryIds.map(kiUri), 'items')
    : [];
  for (const ki of citingDeleted.filter(isLiveItem)) {
    const cited = new Set(citedMemoryKiIds(ki));
    const causes = deletedMemoryIds
      .filter((id) => cited.has(id))
      .map((id) => positionOf.get(id) ?? 0);
    add(ki, 'lost_sources', Math.min(...causes, changed.kis.length));
  }

  const changedFacts = new Map(
    changed.kis.filter((ki) => kindOf(ki) === 'fact').map((ki) => [ki.id, ki])
  );
  const factLinks = changedFacts.size
    ? await reader.citing([...changedFacts.keys()].map(kiUri), 'relationships')
    : [];
  const aboutLinks = (kis: readonly DreamedKi[]) =>
    kis
      .map(parseRelationship)
      .filter((link): link is ParsedRelationship => link?.relation === ABOUT_RELATIONSHIP_TYPE);
  const factChanges = [
    ...aboutLinks(changed.kis).map(({ to, ki }) => ({
      entityId: to,
      permissions: ki.permissions,
      cause: positionOf.get(ki.id) ?? 0,
    })),
    ...aboutLinks(factLinks).flatMap(({ from, to }) => {
      const changedFact = changedFacts.get(from);
      return changedFact
        ? [
            {
              entityId: to,
              permissions: changedFact.permissions,
              cause: positionOf.get(from) ?? 0,
            },
          ]
        : [];
    }),
  ];
  const aboutEntities = factChanges.length
    ? await reader.latestByIds([...new Set(factChanges.map(({ entityId }) => entityId))])
    : new Map<string, DreamedKi>();
  for (const ki of aboutEntities.values()) {
    const causes = factChanges
      .filter(
        ({ entityId, permissions }) =>
          entityId === ki.id && samePermissions(permissions, ki.permissions)
      )
      .map(({ cause }) => cause);
    if (causes.length > 0 && isLiveItem(ki) && kindOf(ki) === 'entity') {
      add(ki, 'about_facts_changed', Math.min(...causes));
    }
  }

  const swept = await reader.sweep(sweepAfterId, sweepSize);
  swept.filter(isLiveItem).forEach((ki) => add(ki, 'sweep'));

  const fixes: MaintenanceChange[] = [];
  const needsReview: MaintenanceChange[] = [];
  let itemFixes = 0;
  const memories = await reader.latestByIds(
    [...review.values()].flatMap(({ ki }) => citedMemoryKiIds(ki))
  );
  const visibleMemoryOf = (memoryId: string): DreamedKi | undefined => {
    const memory = memories.get(memoryId);
    return memory &&
      typeof memory.content === 'string' &&
      isVisibleInSpace(memory.permissions, spaceId)
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
      itemFixes += 1;
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

  const chunksOf = new Map<string, DreamedKi[][]>();
  const dropped = new Set<string>();
  let batchCount = 0;
  for (const { ki } of review.values()) {
    const audience = audienceOf(ki);
    const chunks = chunksOf.get(audience) ?? [];
    const last = chunks.at(-1);
    if (last && last.length < MAINTENANCE_BATCH_SIZE) {
      last.push(ki);
    } else if (batchCount < MAX_MAINTENANCE_BATCHES) {
      chunksOf.set(audience, [...chunks, [ki]]);
      batchCount += 1;
    } else {
      dropped.add(ki.id);
    }
  }
  const reviewed = [...chunksOf.values()].flat(2);
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
      fixes.push({
        id: link.id,
        change: 'tombstoned',
        reason: 'It links an item that was deleted.',
      });
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

  const reviewedIds = new Set(reviewed.map(({ id }) => id));
  const aboutFactIdsOf = new Map<string, string[]>();
  for (const link of liveLinks) {
    if (link.relation === ABOUT_RELATIONSHIP_TYPE && reviewedIds.has(link.to)) {
      aboutFactIdsOf.set(link.to, [...(aboutFactIdsOf.get(link.to) ?? []), link.from]);
    }
  }
  for (const [entityId, factIds] of aboutFactIdsOf) {
    const entityPermissions = known.get(entityId)?.permissions;
    aboutFactIdsOf.set(
      entityId,
      factIds
        .map((factId) => known.get(factId))
        .filter(isLiveItem)
        .filter((factKi) => samePermissions(factKi.permissions, entityPermissions))
        .sort(newestFirst)
        .slice(0, MAX_MAINTENANCE_ABOUT_FACTS)
        .map(({ id }) => id)
    );
  }

  const itemsOf = (ids: Iterable<string>): MaintenanceItem[] =>
    [...ids].flatMap((id) => {
      const ki = known.get(id);
      return ki ? [toMaintenanceItem(ki)] : [];
    });

  const batches: MaintenanceBatch[] = [...chunksOf].flatMap(([audience, chunks]) =>
    chunks.map((part) => {
      const ids = new Set(part.map(({ id }) => id));
      const neighborIds = new Set(
        part
          .flatMap((ki) => (neighborsOf.get(ki.id) ?? []).map(({ id }) => id))
          .filter((id) => !ids.has(id))
          .slice(0, MAX_BATCH_RELATED)
      );
      const shownItems = new Set([...ids, ...neighborIds]);
      const aboutFactIds = new Set(
        [...new Set(part.flatMap((ki) => aboutFactIdsOf.get(ki.id) ?? []))]
          .filter((id) => !shownItems.has(id))
          .slice(0, MAX_BATCH_RELATED)
      );
      const shown = new Set([...shownItems, ...aboutFactIds]);
      const touches = ({ from, to }: MaintenanceRelationship, within: ReadonlySet<string>) =>
        within.has(from) || within.has(to);
      const batchLinks = liveLinks.filter(
        (link) => audienceOf(link.ki) === audience && touches(link, shownItems)
      );
      return {
        audience,
        items: part.map((ki) => {
          const itemNeighborIds = (neighborsOf.get(ki.id) ?? [])
            .map(({ id }) => id)
            .filter((id) => shownItems.has(id));
          const itemAboutFactIds = (aboutFactIdsOf.get(ki.id) ?? []).filter((id) => shown.has(id));
          return {
            ...toMaintenanceItem(ki),
            reasons: [...(review.get(ki.id)?.reasons ?? [])],
            ...(itemNeighborIds.length > 0 && { neighbor_ids: itemNeighborIds }),
            ...(itemAboutFactIds.length > 0 && { about_fact_ids: itemAboutFactIds }),
            ...rewrites.get(ki.id),
          };
        }),
        neighbors: itemsOf(neighborIds),
        about_facts: itemsOf(aboutFactIds),
        relationships: [
          ...batchLinks.filter((link) => touches(link, ids)),
          ...batchLinks.filter((link) => !touches(link, ids)),
        ]
          .slice(0, MAX_BATCH_RELATED)
          .map(({ ki: _ki, ...link }) => link),
      };
    })
  );

  const countOf = (reason: MaintenanceReviewReason) =>
    reviewed.filter(({ id }) => review.get(id)?.reasons.has(reason)).length;
  const droppedCauses = [...dropped].flatMap((id) => {
    const cause = causeOf.get(id);
    return cause === undefined ? [] : [cause];
  });
  // Resumes before the first change whose items did not fit, but always past the first change.
  const resume =
    droppedCauses.length > 0
      ? changed.cursors[Math.max(Math.min(...droppedCauses), 1) - 1]
      : changed.resume;
  const firstDroppedSweep = swept.findIndex(({ id }) => dropped.has(id));
  const lastSwept = swept.at(-1)?.id;
  const sweepAfter =
    firstDroppedSweep === -1
      ? swept.length === sweepSize && lastSwept !== undefined
        ? lastSwept
        : ''
      : firstDroppedSweep === 0
      ? sweepAfterId ?? ''
      : swept[firstDroppedSweep - 1].id;

  // Rounds a hair down first so a share such as 0.1 of 30 allows 3, not 4.
  const shareOfRun = Math.ceil(maxTombstoneShare * (reviewed.length + itemFixes) - 1e-9);

  return {
    reviewed: reviewed.length,
    max_tombstones: Math.max(shareOfRun, MIN_MAINTENANCE_TOMBSTONES),
    batches,
    fixes: fixes.slice(0, MAX_MAINTENANCE_LISTED_CHANGES),
    needs_review: needsReview.slice(0, MAX_MAINTENANCE_LISTED_CHANGES),
    counts: {
      changed: countOf('changed'),
      lost_sources: countOf('lost_sources'),
      about_facts_changed: countOf('about_facts_changed'),
      sweep: countOf('sweep'),
    },
    resume_from: resume?.from ?? '',
    resume_after_id: resume?.afterId ?? '',
    sweep_after_id: sweepAfter,
  };
};
