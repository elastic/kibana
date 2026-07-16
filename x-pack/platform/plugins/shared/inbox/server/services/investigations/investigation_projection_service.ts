/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
import type { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import {
  DAYBREAK_PROPOSAL_STATE_KEY,
  type Investigation,
  type InvestigationDetail,
  type ListInvestigationsResponse,
  type ProposalEnvelope,
} from '../../../common/investigations';

const CONVERSATION_INDEX = chatSystemIndex('conversations');

const QUERYABLE_FIELDS = [
  'conversation_id',
  'title',
  'status',
  'created_at',
  'updated_at',
  'read',
] as const;

const NON_QUERYABLE_FIELDS = [
  'severity',
  'proposal_status',
  'summary',
  'confidence',
  'recommended_action',
  'source_watch_id',
  'watch_execution_id',
  'evidence_ref',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const parseProposalEnvelope = (value: unknown): ProposalEnvelope | undefined => {
  if (!isRecord(value)) return undefined;
  const title = asString(value.title);
  const summary = asString(value.summary);
  const severity = asString(value.severity);
  const status = asString(value.status);
  const sourceWatchId = asString(value.source_watch_id);
  const watchExecutionId = asString(value.watch_execution_id);
  if (!title || !summary || !severity || !status || !sourceWatchId || !watchExecutionId) {
    return undefined;
  }

  const evidenceRef = Array.isArray(value.evidence_ref)
    ? value.evidence_ref.filter((item): item is string => typeof item === 'string')
    : undefined;

  return {
    title,
    summary,
    severity,
    status,
    source_watch_id: sourceWatchId,
    watch_execution_id: watchExecutionId,
    ...(asString(value.recommended_action)
      ? { recommended_action: asString(value.recommended_action) }
      : {}),
    ...(asNumber(value.confidence) !== undefined ? { confidence: asNumber(value.confidence) } : {}),
    ...(evidenceRef?.length ? { evidence_ref: evidenceRef } : {}),
  };
};

interface ConversationSourceRow {
  agent_id?: string;
  user_id?: string;
  user_name?: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  status?: ConversationRoundStatus;
  read?: boolean;
  state?: Record<string, unknown>;
  attachments?: Array<Record<string, unknown>>;
  space?: string;
}

const toConversationWithoutRounds = (
  id: string,
  source: ConversationSourceRow
): ConversationWithoutRounds => ({
  id,
  agent_id: source.agent_id ?? '',
  user: {
    id: source.user_id ?? '',
    username: source.user_name ?? '',
  },
  title: source.title ?? '',
  created_at: source.created_at ?? '',
  updated_at: source.updated_at ?? '',
  status: source.status,
  read: source.read,
  ...(source.state ? { state: source.state } : {}),
});

const extractProposalEnvelope = (
  conversation: ConversationWithoutRounds
): ProposalEnvelope | undefined => {
  const stateRecord = conversation.state as Record<string, unknown> | undefined;
  return parseProposalEnvelope(stateRecord?.[DAYBREAK_PROPOSAL_STATE_KEY]);
};

/**
 * Maps a Conversation to an Investigation row when a materialized proposal envelope exists.
 *
 * POC: envelope is written by watch_floor via experimental PUT into state.daybreak_proposal
 * (#15192 metadata PATCH is the correct long-term write path). This gate is intentional —
 * raw ai.agent conversations are not investigations until materialized.
 *
 * Real gap (not fixed by the PUT hack): severity/provenance remain non-queryable in ES;
 * list still scans conversations and filters in-process. Server-side filter awaits #15192.
 */
export const projectConversationToInvestigation = (
  conversation: ConversationWithoutRounds
): Investigation | undefined => {
  const envelope = extractProposalEnvelope(conversation);
  if (!envelope) return undefined;

  return {
    conversation_id: conversation.id,
    title: conversation.title,
    status: conversation.status,
    severity: envelope.severity,
    proposal_status: envelope.status,
    summary: envelope.summary,
    confidence: envelope.confidence,
    recommended_action: envelope.recommended_action,
    source_watch_id: envelope.source_watch_id,
    watch_execution_id: envelope.watch_execution_id,
    evidence_ref: envelope.evidence_ref,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    read: conversation.read,
  };
};

export interface InvestigationProjectionDeps {
  getEsClient: (request: KibanaRequest) => ElasticsearchClient;
  getSpaceId: (request: KibanaRequest) => string;
}

export class InvestigationProjectionService {
  constructor(private readonly deps: InvestigationProjectionDeps) {}

  async list(request: KibanaRequest): Promise<ListInvestigationsResponse> {
    const esClient = this.deps.getEsClient(request);
    const spaceId = this.deps.getSpaceId(request);

    const response = await esClient.search({
      index: CONVERSATION_INDEX,
      track_total_hits: false,
      size: 500,
      _source: [
        'agent_id',
        'user_id',
        'user_name',
        'title',
        'created_at',
        'updated_at',
        'status',
        'read',
        'state',
        'space',
      ],
      query: {
        bool: {
          filter: [{ term: { space: spaceId } }],
        },
      },
    });

    const investigations = response.hits.hits
      .map((hit) => {
        const source = hit._source as ConversationSourceRow | undefined;
        if (!source || !hit._id) return undefined;
        return projectConversationToInvestigation(toConversationWithoutRounds(hit._id, source));
      })
      .filter((row): row is Investigation => row !== undefined)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

    return {
      investigations,
      queryable_fields: [...QUERYABLE_FIELDS],
      non_queryable_fields: [...NON_QUERYABLE_FIELDS],
    };
  }

  async get(
    request: KibanaRequest,
    conversationId: string
  ): Promise<InvestigationDetail | undefined> {
    const esClient = this.deps.getEsClient(request);
    const spaceId = this.deps.getSpaceId(request);

    const response = await esClient.search({
      index: CONVERSATION_INDEX,
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      _source: [
        'agent_id',
        'user_id',
        'user_name',
        'title',
        'created_at',
        'updated_at',
        'status',
        'read',
        'state',
        'attachments',
        'space',
      ],
      query: {
        bool: {
          filter: [{ term: { space: spaceId } }, { term: { _id: conversationId } }],
        },
      },
    });

    const hit = response.hits.hits[0];
    const source = hit?._source as ConversationSourceRow | undefined;
    if (!source || !hit?._id) {
      return undefined;
    }

    const investigation = projectConversationToInvestigation(
      toConversationWithoutRounds(hit._id, source)
    );
    if (!investigation) {
      return undefined;
    }

    return {
      investigation,
      ...(source.state ? { state: source.state } : {}),
      ...(source.attachments?.length ? { attachments: source.attachments } : {}),
    };
  }
}
