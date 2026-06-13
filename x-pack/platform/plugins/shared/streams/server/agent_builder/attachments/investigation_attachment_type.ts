/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentResolveContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Logger } from '@kbn/core/server';
import { investigationResultSchema, type InvestigationResult } from '@kbn/streams-schema';
import { INVESTIGATION_ATTACHMENT_TYPE } from '../../../common';
import type { GetScopedClients } from '../../routes/types';

interface CreateInvestigationAttachmentTypeOptions {
  logger: Logger;
  getScopedClients: GetScopedClients;
}

export const formatInvestigationAsText = (result: InvestigationResult): string => {
  const lines = [
    `Investigation Result`,
    `Root Cause: ${result.root_cause}`,
    `Confidence: ${Math.round(result.confidence * 100)}%`,
    `Impact: ${result.impact}`,
    `Complete: ${result.investigation_complete ? 'Yes' : 'No — access gaps present'}`,
  ];

  if (result.ranked_hypotheses.length > 0) {
    lines.push('', 'Ranked Hypotheses:');
    for (const hyp of result.ranked_hypotheses) {
      lines.push(
        `  #${hyp.rank} [${hyp.verdict}] ${hyp.statement} (confidence: ${Math.round(
          hyp.posterior_confidence * 100
        )}%)`
      );
    }
  }

  if (result.discarded_hypotheses.length > 0) {
    lines.push('', 'Discarded Hypotheses:');
    for (const hyp of result.discarded_hypotheses) {
      lines.push(`  [discarded] ${hyp.statement}: ${hyp.discard_reason}`);
    }
  }

  if (result.remediation_options.length > 0) {
    lines.push('', 'Remediation Options:');
    for (const opt of result.remediation_options) {
      lines.push(`  #${opt.rank} [${opt.risk_level} risk] ${opt.action}`);
    }
  }

  if (result.gaps_found.length > 0) {
    lines.push('', 'Access Gaps:', ...result.gaps_found.map((g) => `  - ${g}`));
  }

  return lines.join('\n');
};

export const createInvestigationAttachmentType = ({
  logger,
  getScopedClients,
}: CreateInvestigationAttachmentTypeOptions): AttachmentTypeDefinition<
  typeof INVESTIGATION_ATTACHMENT_TYPE,
  InvestigationResult
> => {
  const fetchByDiscoveryId = async (
    discoveryId: string,
    context: AttachmentResolveContext
  ): Promise<InvestigationResult | undefined> => {
    const { getDiscoveryClient } = await getScopedClients({ request: context.request });
    const { hits } = await getDiscoveryClient().findById(discoveryId);
    const latest = hits.at(-1);
    return latest?.investigation ?? undefined;
  };

  return {
    id: INVESTIGATION_ATTACHMENT_TYPE,
    isReadonly: true,
    validate: (input) => {
      const parseResult = investigationResultSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    resolve: async (origin, context): Promise<InvestigationResult | undefined> => {
      try {
        return await fetchByDiscoveryId(origin, context);
      } catch (error) {
        logger.warn(
          `Failed to resolve investigation attachment for discovery "${origin}": ${error}`
        );
        return undefined;
      }
    },
    isStale: async (
      attachment: VersionedAttachment<typeof INVESTIGATION_ATTACHMENT_TYPE, InvestigationResult>,
      context
    ): Promise<boolean> => {
      if (!attachment.origin) {
        return false;
      }

      const latestVersion = getLatestVersion(attachment);
      if (!latestVersion) {
        return false;
      }

      try {
        const { getDiscoveryClient } = await getScopedClients({ request: context.request });
        const { hits } = await getDiscoveryClient().findById(attachment.origin);
        const doc = hits.at(-1);
        if (!doc?.investigation) {
          return false;
        }

        // Strip DB-level metadata fields before comparing: completed_at and
        // workflow_execution_id change on every write-back even when the
        // InvestigationResult content is identical. Including them would mark
        // every attachment stale on the next orchestrator cycle.
        const {
          completed_at: _completedAt,
          workflow_execution_id: _workflowExecutionId,
          ...currentInvestigation
        } = doc.investigation;
        return JSON.stringify(currentInvestigation) !== JSON.stringify(latestVersion.data);
      } catch (error) {
        logger.warn(
          `Failed to check staleness for investigation attachment "${attachment.origin}": ${error}`
        );
        return false;
      }
    },
    format: (attachment) => ({
      getRepresentation: () => ({
        type: 'text',
        value: formatInvestigationAsText(attachment.data),
      }),
    }),
    getAgentDescription: () =>
      'An investigation attachment shows the results of a root cause analysis investigation for a significant event. It displays ranked hypotheses with their verdicts, confidence scores, remediation options, and any access gaps that limited the investigation. Use it to share investigation results inline in the conversation.',
    getTools: () => [],
  };
};
