/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ENRICHED_AT_ATTRIBUTE,
  OCCURRENCES_ATTRIBUTE,
  WIKI_MEMBER_COUNT_ATTRIBUTE,
  WIKI_MEMBER_REFERENCE_DESCRIPTION,
  WIKI_PAGE_KI_TYPE,
  matchesKiTypeFilters,
} from '../../common/dreaming';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { MAX_KI_REFERENCES } from '../../common/step_types/ki';
import type { Evidence } from '../../common/step_types/research';
import { DEFAULT_WIKI_PAGE_MEMBERS, MAX_WIKI_PAGE_MEMBERS } from '../../common/step_types/wiki';
import { buildAiIndexSpaceFilter } from '../../common/space_filter';
import type { KiWriter } from '../ai_indices/ki_revision';
import { baseContent } from './access_patterns';
import { kiTypeFilterQuery, readActiveKi, readActiveKis, writeKi } from './active_kis';
import type { DreamedKi, DreamedKiReference } from './dreamed_ki';
import { withEvidenceReferences } from './enrichment';
import { kiIdFromUri, kiUri, wikiPageId } from './ids';
import {
  audienceKeyOf,
  derivedPermissions,
  samePermissions,
  type KiPermissions,
} from './permissions';

/** How much of a member's content the writing model reads. */
const MEMBER_CONTENT_LENGTH = 1200;
/** Ids read beyond the member cap, for those that turn out inactive or seen by others. */
const MEMBER_READ_SLACK = 20;
const NEW_PAGE_REF_PREFIX = 'new:';

/** A knowledge item a wiki page ties together, as the writing model reads it. */
export interface WikiMember {
  id: string;
  type: string;
  title: string;
  description?: string;
  content?: string;
  occurrences?: number;
}

/** A wiki page as the writing model reads it. */
export interface WikiPage {
  id: string;
  title: string;
  description?: string;
  content?: string;
  member_ids: string[];
}

const truncate = (text: string, length: number): string =>
  text.length <= length ? text : `${text.slice(0, length - 1)}…`;

const isAbort = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'RequestAbortedError');

/** The ids of the knowledge items a wiki page ties together. */
export const memberIdsOf = (page: Pick<DreamedKi, 'references'>): string[] =>
  (page.references ?? []).flatMap(({ uri, relation, description }) => {
    const id =
      relation === 'relates_to' && description === WIKI_MEMBER_REFERENCE_DESCRIPTION
        ? kiIdFromUri(uri)
        : undefined;
    return id !== undefined ? [id] : [];
  });

const toMember = (ki: DreamedKi): WikiMember => {
  const content = baseContent(ki.content);
  const occurrences = ki.attributes?.[OCCURRENCES_ATTRIBUTE];
  return {
    id: ki.id,
    type: ki.type,
    title: ki.title,
    ...(ki.description && { description: ki.description }),
    ...(content && { content: truncate(content, MEMBER_CONTENT_LENGTH) }),
    ...(typeof occurrences === 'number' && { occurrences }),
  };
};

const isNewPageRef = (ref: string | undefined): boolean =>
  ref === undefined || ref.length === 0 || ref.startsWith(NEW_PAGE_REF_PREFIX);

/** The existing wiki page a ref names, when it is one. */
const readPage = async (
  params: Omit<Parameters<typeof readActiveKi>[0], 'kiId'>,
  pageRef: string | undefined
): Promise<DreamedKi | undefined> => {
  if (pageRef === undefined || isNewPageRef(pageRef)) {
    return undefined;
  }
  const found = await readActiveKi({ ...params, kiId: pageRef });
  return found?.ki.type === WIKI_PAGE_KI_TYPE ? found.ki : undefined;
};

/** The ids of the knowledge items most related to a query, best first. */
export const searchRelatedKiIds = async ({
  esClient,
  dest,
  spaceId,
  kiTypes,
  query,
  size,
  logger,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  dest: AiIndexDest;
  spaceId: string;
  kiTypes: readonly string[];
  query: string;
  size: number;
  logger: Logger;
  abortSignal?: AbortSignal;
}): Promise<string[]> => {
  const lexical: QueryDslQueryContainer = {
    multi_match: { query, fields: ['title^2', 'description', 'content'] },
  };
  const semantic: QueryDslQueryContainer[] = ['title', 'description', 'content'].map((field) => ({
    match: { [`${field}.semantic`]: { query } },
  }));
  const search = (should: QueryDslQueryContainer[]) =>
    esClient.search<{ id?: string }>(
      {
        index: dest.value,
        ignore_unavailable: true,
        size,
        collapse: { field: 'id' },
        _source: ['id'],
        query: {
          bool: {
            should,
            minimum_should_match: 1,
            filter: [kiTypeFilterQuery(kiTypes), buildAiIndexSpaceFilter(spaceId)],
            must_not: [{ term: { type: WIKI_PAGE_KI_TYPE } }],
          },
        },
      },
      { signal: abortSignal }
    );
  let response;
  try {
    response = await search([lexical, ...semantic]);
  } catch (error) {
    if (isAbort(error)) {
      throw error;
    }
    logger.debug(
      () =>
        `Semantic search for wiki members failed, searching by keywords only: ${
          error instanceof Error ? error.message : String(error)
        }`
    );
    response = await search([lexical]);
  }
  return response.hits.hits.flatMap(({ _source }) => (_source?.id ? [_source.id] : []));
};

/** What a wiki page is written from. */
export interface GatheredWikiPage {
  /** The page as it is, when it exists. */
  page?: WikiPage;
  /** The knowledge items it ties together, seeds first. */
  members: WikiMember[];
  /** Candidate members left out: no longer active, seen by other people, or over the cap. */
  dropped: number;
}

/**
 * Gathers what a wiki page is written from: the page as it is, and its members. The members are
 * the seed items the page was planned from, the page's current members, and the knowledge items
 * most related to `memberQuery`, all of the filtered types and seen by the same people as the
 * page, so a page never shows one audience what another saved.
 */
export const gatherWikiPage = async ({
  esClient,
  aiIndexId,
  dest,
  spaceId,
  pageRef,
  seedIds,
  memberQuery,
  kiTypes,
  maxMembers = DEFAULT_WIKI_PAGE_MEMBERS,
  logger,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  dest: AiIndexDest;
  spaceId: string;
  pageRef?: string;
  seedIds: readonly string[];
  memberQuery?: string;
  kiTypes: readonly string[];
  maxMembers?: number;
  logger: Logger;
  abortSignal?: AbortSignal;
}): Promise<GatheredWikiPage> => {
  const read = { esClient, aiIndexId, dest, spaceId, abortSignal };
  const cap = Math.min(Math.max(1, maxMembers), MAX_WIKI_PAGE_MEMBERS);
  const page = await readPage(read, pageRef);
  const isMember = (ki: DreamedKi) =>
    ki.type !== WIKI_PAGE_KI_TYPE && matchesKiTypeFilters(ki.type, kiTypes);
  const seeds = (await readActiveKis({ ...read, ids: seedIds })).filter(isMember);
  if (!page && seeds.length === 0) {
    return { members: [], dropped: seedIds.length };
  }
  const audience = page ? page.permissions : seeds[0].permissions;
  const pageMemberIds = page ? memberIdsOf(page) : [];
  const related = memberQuery?.trim()
    ? await searchRelatedKiIds({
        esClient,
        dest,
        spaceId,
        kiTypes,
        query: memberQuery.trim(),
        size: cap,
        logger,
        abortSignal,
      })
    : [];
  const seedIdSet = new Set(seeds.map(({ id }) => id));
  const candidateIds = [
    ...new Set([...pageMemberIds, ...related].filter((id) => !seedIdSet.has(id))),
  ].filter((id) => id !== page?.id);
  const others = (
    await readActiveKis({ ...read, ids: candidateIds.slice(0, cap + MEMBER_READ_SLACK) })
  ).filter(isMember);
  const members = [...seeds, ...others].filter(({ permissions }) =>
    samePermissions(permissions, audience)
  );
  const kept = members.slice(0, cap);
  const candidates = seedIds.length + candidateIds.length;
  return {
    ...(page && {
      page: {
        id: page.id,
        title: page.title,
        ...(page.description && { description: page.description }),
        ...(page.content && { content: page.content }),
        member_ids: pageMemberIds,
      },
    }),
    members: kept.map(toMember),
    dropped: Math.max(0, candidates - kept.length),
  };
};

/** What the writing model returned for a wiki page. */
export interface WikiPageChange {
  title: string;
  description?: string;
  content: string;
  member_ids: string[];
  citations?: string[];
}

export interface WikiPageOutcome {
  status: 'created' | 'updated' | 'skipped';
  id?: string;
  reason?: string;
  members: number;
  cited: string[];
  dropped_citations: string[];
  document?: DreamedKi;
}

const memberReferences = (ids: readonly string[]): DreamedKiReference[] =>
  ids.map((id) => ({
    uri: kiUri(id),
    relation: 'relates_to',
    description: WIKI_MEMBER_REFERENCE_DESCRIPTION,
  }));

const sameMembers = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && [...a].sort().join('\u0000') === [...b].sort().join('\u0000');

/**
 * Writes a wiki page: creates it, or updates the page `pageRef` names. Its members must be active
 * knowledge items seen by the same people, the page's audience; others are left out, and a page
 * left with none is not written. The page is visible to exactly that audience, cites the evidence
 * it is based on, and records its members as `relates_to` references.
 */
export const applyWikiPage = async ({
  esClient,
  aiIndexId,
  dest,
  spaceId,
  writer,
  pageRef,
  change,
  evidence,
  dryRun = false,
  now = () => new Date(),
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  dest: AiIndexDest;
  spaceId: string;
  writer: KiWriter;
  pageRef?: string;
  change: WikiPageChange;
  evidence: readonly Evidence[];
  dryRun?: boolean;
  now?: () => Date;
  abortSignal?: AbortSignal;
}): Promise<WikiPageOutcome> => {
  const read = { esClient, aiIndexId, dest, spaceId, abortSignal };
  const shown = new Map(evidence.map((item) => [item.id, item]));
  const citations = [...new Set(change.citations ?? [])];
  const cited = citations.filter((id) => shown.has(id));
  const droppedCitations = citations.filter((id) => !shown.has(id));
  const skipped = (reason: string): WikiPageOutcome => ({
    status: 'skipped',
    reason,
    members: 0,
    cited: [],
    dropped_citations: droppedCitations,
  });

  const title = change.title.trim();
  const content = change.content.trim();
  if (title.length === 0 || content.length === 0) {
    return skipped('it has no title or content');
  }
  const page = await readPage(read, pageRef);
  const candidates = (
    await readActiveKis({ ...read, ids: change.member_ids.slice(0, MAX_WIKI_PAGE_MEMBERS) })
  ).filter(({ type }) => type !== WIKI_PAGE_KI_TYPE);
  const audience: KiPermissions | undefined = page ? page.permissions : candidates[0]?.permissions;
  const members = candidates.filter(({ permissions }) => samePermissions(permissions, audience));
  if (members.length === 0) {
    return skipped('it ties no knowledge items together');
  }
  const memberIds = members.map(({ id }) => id);
  const permissions = derivedPermissions([audience], spaceId);
  const kiId = page?.id ?? wikiPageId(title, audienceKeyOf([audience]));

  const outcome = await writeKi({
    esClient,
    aiIndexId,
    dest,
    spaceId,
    writer,
    kiId,
    dryRun,
    abortSignal,
    build: (current) => {
      if (current && current.type !== WIKI_PAGE_KI_TYPE) {
        return { skip: `its id '${kiId}' belongs to a knowledge item that is not a wiki page` };
      }
      if (current && !samePermissions(current.permissions, permissions)) {
        return { skip: 'the page is seen by other people than its members' };
      }
      if (
        current &&
        current.title === title &&
        current.content === content &&
        (change.description?.trim() ?? current.description) === current.description &&
        sameMembers(memberIdsOf(current), memberIds) &&
        cited.length === 0
      ) {
        return { skip: 'nothing changed' };
      }
      const {
        governance: _governance,
        permissions: _permissions,
        references: currentReferences,
        ...rest
      } = current ?? ({} as Partial<DreamedKi>);
      const evidenceReferences = withEvidenceReferences(
        (currentReferences ?? []).filter(
          ({ description }) => description !== WIKI_MEMBER_REFERENCE_DESCRIPTION
        ),
        cited.map((id) => shown.get(id) as Evidence)
      );
      return {
        document: {
          ...rest,
          id: kiId,
          type: WIKI_PAGE_KI_TYPE,
          title,
          ...(change.description?.trim()
            ? { description: change.description.trim() }
            : current?.description !== undefined && { description: current.description }),
          content,
          attributes: {
            ...current?.attributes,
            [WIKI_MEMBER_COUNT_ATTRIBUTE]: memberIds.length,
            ...(cited.length > 0 && { [ENRICHED_AT_ATTRIBUTE]: now().toISOString() }),
          },
          references: [...memberReferences(memberIds), ...evidenceReferences].slice(
            0,
            MAX_KI_REFERENCES
          ),
          ...(permissions && { permissions }),
        },
      };
    },
  });
  if (outcome.status === 'skipped') {
    return { ...skipped(outcome.reason), id: kiId };
  }
  return {
    status: outcome.status,
    id: kiId,
    members: memberIds.length,
    cited,
    dropped_citations: droppedCitations,
    document: outcome.document as DreamedKi,
  };
};
