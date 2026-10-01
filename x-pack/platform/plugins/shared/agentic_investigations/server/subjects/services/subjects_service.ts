/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { z } from '@kbn/zod/v4';
import type { User } from '../../../common/user';
import {
  MAX_SUBJECTS_PER_CONVERSATION,
  MAX_SUBJECTS_PER_REQUEST,
} from '../../../common/subjects/constants';
import {
  investigationSubjectInputsSchema,
  investigationSubjectKeySchema,
  type InvestigationSubject,
  type InvestigationSubjectInput,
  type InvestigationSubjectKey,
} from '../../../common/subjects/subject';
import {
  hashInvestigationAttachmentId,
  InvestigationAttachmentInvalidRequestError,
  type InvestigationAttachmentDocService,
} from '../../investigation_attachments';
import { sameInvestigationAttachmentDocument } from '../../investigation_attachments/same_document';
import { subjectAttachment } from '../attachments/subject_attachment_type';
import type { SubjectDocument } from '../storage/subject_storage';
import type {
  ClaimSubjectsParams,
  ClaimSubjectsResult,
  SubjectClaimsService,
} from './subject_claims_service';

export interface UpsertSubjectsParams {
  conversationId: string;
  subjects: InvestigationSubjectInput[];
  spaceId: string;
  user?: User;
  conversations: ConversationPublicClient;
  attachments: AttachmentPublicClient;
}

/** One subject document per space, conversation, and subject. */
export const subjectDocumentId = (
  spaceId: string,
  conversationId: string,
  { type, id }: InvestigationSubjectKey
): string => hashInvestigationAttachmentId(spaceId, conversationId, type, id);

const subjectKey = ({ type, id }: InvestigationSubjectKey): string => `${type}\0${id}`;

const parseOrThrow = <TSchema extends z.ZodType>(
  schema: TSchema,
  value: unknown
): z.infer<TSchema> => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new InvestigationAttachmentInvalidRequestError(result.error.message);
  }
  return result.data;
};

const subjectKeysSchema = investigationSubjectKeySchema.array().max(MAX_SUBJECTS_PER_REQUEST);

/** Later inputs for the same subject override earlier ones; `slack` merges field by field. */
const mergeInputs = (subjects: InvestigationSubjectInput[]): InvestigationSubjectInput[] => {
  const byKey = new Map<string, InvestigationSubjectInput>();
  for (const subject of subjects) {
    const current = byKey.get(subjectKey(subject));
    byKey.set(
      subjectKey(subject),
      current
        ? {
            ...current,
            ...definedFields(subject),
            ...(current.slack &&
              subject.slack && { slack: { ...current.slack, ...subject.slack } }),
          }
        : subject
    );
  }
  return [...byKey.values()];
};

const definedFields = ({
  summary,
  triggerType,
  snapshot,
  slack,
}: InvestigationSubjectInput): Partial<SubjectDocument> => ({
  ...(summary !== undefined && { summary }),
  ...(triggerType !== undefined && { triggerType }),
  ...(snapshot !== undefined && { snapshot }),
  ...(slack !== undefined && { slack }),
});

const withoutTimestamps = ({ updatedAt: _updatedAt, ...rest }: SubjectDocument): object => rest;

/**
 * Owns the subject index: what each investigation is about, one document per subject. Subjects
 * are written by the routes and steps that start or follow up on an investigation, outside agent
 * turns, so attachments go through the public attachment client. There is no agent tool.
 */
export class SubjectsService {
  constructor(
    private readonly deps: {
      documents: InvestigationAttachmentDocService<SubjectDocument>;
      claims: SubjectClaimsService;
    }
  ) {}

  /** The generic store, for the Agent Builder attachment type's resolve and staleness checks. */
  getDocumentService(): InvestigationAttachmentDocService<SubjectDocument> {
    return this.deps.documents;
  }

  /**
   * Records subjects on an investigation and attaches each one to its conversation by reference.
   * A subject already recorded keeps what the write leaves out; an unchanged subject is not
   * re-stamped. Requires the caller to own the conversation (see `writeAndAttach`).
   */
  async upsertSubjects({
    conversationId,
    subjects,
    spaceId,
    user,
    conversations,
    attachments,
  }: UpsertSubjectsParams): Promise<InvestigationSubject[]> {
    const inputs = mergeInputs(parseOrThrow(investigationSubjectInputsSchema, subjects));
    await this.assertSubjectCeiling(conversationId, spaceId, inputs);

    const written: InvestigationSubject[] = [];
    // One at a time: every write appends to the same conversation.
    for (const input of inputs) {
      written.push(
        await subjectAttachment.writeAndAttach({
          service: this.deps.documents,
          id: subjectDocumentId(spaceId, conversationId, input),
          spaceId,
          conversationId,
          conversations,
          attachments,
          mutate: (existing) => {
            const now = new Date().toISOString();
            if (!existing) {
              return {
                spaceId,
                conversationId,
                subjectType: input.type,
                subjectId: input.id,
                ...definedFields(input),
                createdAt: now,
                ...(user && { createdBy: user }),
                updatedAt: now,
              };
            }
            const { id: _id, ...stored } = existing;
            const next: SubjectDocument = {
              ...stored,
              ...definedFields(input),
              ...(stored.slack && input.slack && { slack: { ...stored.slack, ...input.slack } }),
            };
            return sameInvestigationAttachmentDocument(
              withoutTimestamps(next),
              withoutTimestamps(stored)
            )
              ? stored
              : { ...next, updatedAt: now };
          },
        })
      );
    }
    return written;
  }

  /**
   * Investigations (conversation ids) that hold any of the subjects, in the space. Open or
   * closed, and unchecked for access: callers read the conversations to decide.
   */
  async findConversationIdsBySubjects(
    subjects: InvestigationSubjectKey[],
    spaceId: string
  ): Promise<string[]> {
    const keys = parseOrThrow(subjectKeysSchema, subjects);
    if (keys.length === 0) {
      return [];
    }
    const filter: QueryDslQueryContainer[] = [
      {
        bool: {
          should: keys.map(({ type, id }) => ({
            bool: { filter: [{ term: { subjectType: type } }, { term: { subjectId: id } }] },
          })),
          minimum_should_match: 1,
        },
      },
    ];
    return this.deps.documents.searchConversationIds({ spaceId, filter });
  }

  /** Every subject of the given investigations in the space. */
  async listByConversationIds(
    conversationIds: string[],
    spaceId: string
  ): Promise<InvestigationSubject[]> {
    return this.deps.documents.listByConversationIds(conversationIds, spaceId);
  }

  /**
   * Race-safe start: claims the subjects for a new investigation before its conversation is
   * created. See {@link SubjectClaimsService.claim}.
   */
  async claimSubjects(params: ClaimSubjectsParams): Promise<ClaimSubjectsResult> {
    const subjects = parseOrThrow(subjectKeysSchema.min(1), params.subjects);
    return this.deps.claims.claim({ ...params, subjects });
  }

  private async assertSubjectCeiling(
    conversationId: string,
    spaceId: string,
    inputs: InvestigationSubjectInput[]
  ): Promise<void> {
    const existing = new Set(
      (await this.deps.documents.listByConversationIds([conversationId], spaceId)).map(
        ({ subjectType, subjectId }) => subjectKey({ type: subjectType, id: subjectId })
      )
    );
    const added = inputs.filter((input) => !existing.has(subjectKey(input))).length;
    if (existing.size + added > MAX_SUBJECTS_PER_CONVERSATION) {
      throw new InvestigationAttachmentInvalidRequestError(
        `An investigation may not have more than ${MAX_SUBJECTS_PER_CONVERSATION} subjects`
      );
    }
  }
}
