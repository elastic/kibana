/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { SUBJECT_CLAIM_INDEX_NAME } from '../../../common/subjects/constants';
import type { InvestigationSubjectKey } from '../../../common/subjects/subject';
import {
  hashInvestigationAttachmentId,
  InvestigationAttachmentConflictError,
  type InvestigationAttachmentStorage,
} from '../../investigation_attachments';
import { isVersionConflict } from '../../investigation_attachments/errors';
import {
  subjectClaimStorageSettings,
  type SubjectClaimDocument,
  type SubjectClaimStorageSettings,
} from '../storage/subject_storage';

/**
 * How long a fresh claim holds without its investigation being checked. Covers the gap between
 * claiming a subject and creating the investigation's conversation, during which the holder
 * cannot be read yet.
 */
export const SUBJECT_CLAIM_PENDING_MS = 2 * 60 * 1000;

const MAX_CLAIM_ATTEMPTS = 3;
const MAX_DELETE_PAGES = 100;
const DELETE_PAGE_SIZE = 1000;

/** Outcome of {@link SubjectClaimsService.claim}: all subjects claimed, or the holding investigation. */
export type ClaimSubjectsResult = { claimed: true } | { claimed: false; heldBy: string };

export interface ClaimSubjectsParams {
  spaceId: string;
  /** The investigation (conversation id) to claim the subjects for. */
  conversationId: string;
  subjects: InvestigationSubjectKey[];
  /**
   * Whether the investigation holding a claim is still open. A claim past its pending window
   * whose holder is closed, or no longer exists, is taken over.
   */
  isHolderOpen: (conversationId: string) => Promise<boolean>;
}

/** The subject claim index, as the storage adapter provides it. */
export type SubjectClaimStorage = InvestigationAttachmentStorage<SubjectClaimDocument>;

export const createSubjectClaimStorageClient = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): SubjectClaimStorage =>
  new StorageIndexAdapter<SubjectClaimStorageSettings, SubjectClaimDocument>(
    esClient,
    logger,
    subjectClaimStorageSettings
  ).getClient();

/** One claim document per space and subject. */
export const subjectClaimId = (spaceId: string, { type, id }: InvestigationSubjectKey): string =>
  hashInvestigationAttachmentId(spaceId, type, id);

interface VersionedClaim {
  claim: SubjectClaimDocument;
  seqNo: number;
  primaryTerm: number;
}

type ClaimOneOutcome = { taken: boolean } | { heldBy: string };

/**
 * Create-if-absent claims that make starting an investigation race-safe: of two concurrent starts
 * for the same subject, one claims it and the other learns which investigation holds it, and
 * follows up on that one instead of opening a second. Reads and writes go through the internal
 * user; callers authorize first.
 */
export class SubjectClaimsService {
  private readonly now: () => number;

  constructor(private readonly deps: { storage: SubjectClaimStorage; now?: () => number }) {
    this.now = deps.now ?? Date.now;
  }

  /**
   * Claims every subject for the investigation, or none. Subjects are claimed in a fixed order,
   * so two starts with overlapping subjects contend for the same subject first. When a subject is
   * held by another open (or still pending) investigation, the claims this call made are
   * released and that investigation is returned; it may not have its conversation yet, so a
   * follow-up has to get or create it.
   */
  async claim({
    spaceId,
    conversationId,
    subjects,
    isHolderOpen,
  }: ClaimSubjectsParams): Promise<ClaimSubjectsResult> {
    const claims = new Map(subjects.map((subject) => [subjectClaimId(spaceId, subject), subject]));
    const ordered = [...claims.entries()].sort(([left], [right]) => left.localeCompare(right));

    const taken: string[] = [];
    for (const [id, subject] of ordered) {
      const outcome = await this.claimOne({ id, spaceId, conversationId, subject, isHolderOpen });
      if ('heldBy' in outcome) {
        await this.release(spaceId, conversationId, taken);
        return { claimed: false, heldBy: outcome.heldBy };
      }
      if (outcome.taken) {
        taken.push(id);
      }
    }
    return { claimed: true };
  }

  /** Maintenance: removes every claim in the space. */
  async deleteAllInSpace(spaceId: string): Promise<number> {
    let deleted = 0;
    for (let page = 0; page < MAX_DELETE_PAGES; page++) {
      const response = await this.deps.storage.search({
        track_total_hits: false,
        size: DELETE_PAGE_SIZE,
        _source: false,
        query: { bool: { filter: [{ term: { spaceId } }] } },
      });
      const ids = response.hits.hits.flatMap((hit) => (hit._id !== undefined ? [hit._id] : []));
      if (ids.length === 0) {
        return deleted;
      }
      await this.deps.storage.bulk({
        operations: ids.map((id) => ({ delete: { _id: id } })),
        throwOnFail: true,
      });
      deleted += ids.length;
    }
    return deleted;
  }

  private async claimOne({
    id,
    spaceId,
    conversationId,
    subject,
    isHolderOpen,
  }: {
    id: string;
    spaceId: string;
    conversationId: string;
    subject: InvestigationSubjectKey;
    isHolderOpen: ClaimSubjectsParams['isHolderOpen'];
  }): Promise<ClaimOneOutcome> {
    const document: SubjectClaimDocument = {
      spaceId,
      conversationId,
      subjectType: subject.type,
      subjectId: subject.id,
      claimedAt: new Date(this.now()).toISOString(),
    };

    for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt++) {
      const existing = await this.findVersioned(id);
      try {
        if (!existing) {
          await this.deps.storage.index({ id, document, op_type: 'create' });
          return { taken: true };
        }
        if (existing.claim.conversationId === conversationId) {
          return { taken: false };
        }
        if (await this.isHolderLive(existing.claim, isHolderOpen)) {
          return { heldBy: existing.claim.conversationId };
        }
        await this.deps.storage.index({
          id,
          document,
          if_seq_no: existing.seqNo,
          if_primary_term: existing.primaryTerm,
        });
        return { taken: true };
      } catch (error) {
        if (!isVersionConflict(error)) {
          throw error;
        }
      }
    }
    throw new InvestigationAttachmentConflictError(SUBJECT_CLAIM_INDEX_NAME, id);
  }

  private async isHolderLive(
    { claimedAt, conversationId }: SubjectClaimDocument,
    isHolderOpen: ClaimSubjectsParams['isHolderOpen']
  ): Promise<boolean> {
    const claimedAtMs = Date.parse(claimedAt);
    if (Number.isFinite(claimedAtMs) && this.now() - claimedAtMs < SUBJECT_CLAIM_PENDING_MS) {
      return true;
    }
    return isHolderOpen(conversationId);
  }

  /** Deletes the given claims while this investigation still holds them. */
  private async release(spaceId: string, conversationId: string, ids: string[]): Promise<void> {
    for (const id of ids) {
      const existing = await this.findVersioned(id);
      if (
        !existing ||
        existing.claim.spaceId !== spaceId ||
        existing.claim.conversationId !== conversationId
      ) {
        continue;
      }
      try {
        await this.deps.storage.delete({
          id,
          if_seq_no: existing.seqNo,
          if_primary_term: existing.primaryTerm,
        });
      } catch (error) {
        if (!isVersionConflict(error)) {
          throw error;
        }
      }
    }
  }

  private async findVersioned(id: string): Promise<VersionedClaim | undefined> {
    const response = await this.deps.storage.search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      seq_no_primary_term: true,
      query: { bool: { filter: [{ term: { _id: id } }] } },
    });
    const hit = response.hits.hits[0];
    if (!hit) {
      return undefined;
    }
    if (!hit._source || hit._seq_no === undefined || hit._primary_term === undefined) {
      throw new Error(`Subject claim [${id}] is missing concurrency metadata`);
    }
    return { claim: hit._source, seqNo: hit._seq_no, primaryTerm: hit._primary_term };
  }
}
