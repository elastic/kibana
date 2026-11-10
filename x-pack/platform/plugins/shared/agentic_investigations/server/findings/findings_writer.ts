/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import type { Hypothesis } from '../../common/hypotheses/hypotheses';
import type { ImpactEntity } from '../../common/impact/impact';
import type { InvestigationEvidence } from '../../common/evidence';
import type { HypothesesService } from '../hypotheses/services/hypotheses_service';
import { attachImpactToInvestigation } from '../impact/attachments/attach_impact_to_investigation';
import type { ImpactService } from '../impact/services/impact_service';
import type { InvestigationsPrivilegesChecker } from '../investigations/services/check_investigations_privileges';
import type { ResolveUser } from '../services/resolve_user';

/**
 * Writes the findings an agent would otherwise record with `set_hypotheses` and `set_impact`,
 * for callers that run outside an agent's tool call: a hook, a workflow, a background pass.
 */
export interface FindingsWriter {
  /** Replaces the stored hypotheses with this snapshot and keeps the conversation attachment current. */
  setHypotheses: (params: { conversationId: string; hypotheses: Hypothesis[] }) => Promise<void>;
  /**
   * Sets the impact. A present field replaces the stored one, `null` removes `summary` or
   * `evidence`, and an absent field is kept, as with `set_impact`.
   */
  setImpact: (params: {
    conversationId: string;
    summary?: string | null;
    evidence?: InvestigationEvidence | null;
    entities?: ImpactEntity[];
  }) => Promise<void>;
  /** The findings stored for the conversation: its hypotheses and impact, if any. */
  getFindings: (params: { conversationId: string }) => Promise<{
    hypotheses: Hypothesis[];
    impactSummary?: string;
    impactEvidence?: InvestigationEvidence;
    impactEntities: ImpactEntity[];
  }>;
}

export interface FindingsWriterDeps {
  getHypothesesService: () => HypothesesService;
  getImpactService: () => ImpactService;
  getSpaceId: (request: KibanaRequest) => string;
  /** Writes need the investigations manage privilege. */
  privileges: InvestigationsPrivilegesChecker;
  resolveUser: ResolveUser;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  getAttachmentClient: (request: KibanaRequest) => Promise<AttachmentPublicClient>;
}

export const createFindingsWriter =
  ({
    getHypothesesService,
    getImpactService,
    getSpaceId,
    privileges,
    resolveUser,
    getConversationClient,
    getAttachmentClient,
  }: FindingsWriterDeps) =>
  (request: KibanaRequest): FindingsWriter => {
    const resolveContext = async () => {
      await privileges.assertCanManage(request);
      const [conversations, attachments, user] = await Promise.all([
        getConversationClient(request),
        getAttachmentClient(request),
        resolveUser(request),
      ]);
      return { conversations, attachments, user, spaceId: getSpaceId(request) };
    };

    return {
      getFindings: async ({ conversationId }) => {
        await privileges.assertCanManage(request);
        const spaceId = getSpaceId(request);
        const [stored, impact] = await Promise.all([
          getHypothesesService().findByConversationId(conversationId, spaceId),
          getImpactService().findByConversationId(conversationId, spaceId),
        ]);
        return {
          hypotheses: stored?.hypotheses ?? [],
          impactSummary: impact?.summary,
          impactEvidence: impact?.evidence,
          impactEntities: impact?.entities ?? [],
        };
      },
      setHypotheses: async ({ conversationId, hypotheses }) => {
        const { conversations, attachments, user, spaceId } = await resolveContext();
        await getHypothesesService().setWithPublicClient({
          conversationId,
          hypotheses,
          spaceId,
          user,
          conversations,
          attachments,
        });
      },
      setImpact: async ({ conversationId, summary, evidence, entities }) => {
        const { conversations, attachments, user, spaceId } = await resolveContext();
        const service = getImpactService();
        await attachImpactToInvestigation({
          conversations,
          attachments,
          conversationId,
          readImpact: () => service.getByConversationId(conversationId, spaceId),
          writeImpact: () =>
            service.set({ conversationId, summary, evidence, entities }, { spaceId, user }),
          revertImpact: (written) => service.revertAttach(written),
        });
      },
    };
  };
