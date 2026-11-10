/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HYPOTHESES_ATTACHMENT_TYPE } from '../../../common/hypotheses/constants';
import {
  investigationHypothesesSchema,
  type Hypothesis,
  type InvestigationHypotheses,
} from '../../../common/hypotheses/hypotheses';
import {
  defineInvestigationAttachment,
  formatEvidenceForAgent,
} from '../../investigation_attachments';
import {
  hypothesesStorageSettings,
  type HypothesesDocument,
  type HypothesesStorageSettings,
} from '../storage/hypotheses_storage';

const indent = (text: string): string =>
  text
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

const formatHypothesis = ({ candidate, confidence, status, reason, evidence = [] }: Hypothesis) =>
  [
    `- [${status}, confidence ${Math.round(confidence * 100)}%] ${candidate}`,
    reason ? `  Reason: ${reason}` : undefined,
    ...evidence.map((item) => `  Evidence:\n${indent(formatEvidenceForAgent(item))}`),
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');

/** Text the LLM sees: every hypothesis with its status, confidence, reason, and evidence summary. */
export const formatHypothesesForAgent = ({
  conversationId,
  hypotheses,
}: InvestigationHypotheses): string =>
  [
    '## Investigation hypotheses',
    `Conversation: ${conversationId}`,
    hypotheses.length > 0 ? hypotheses.map(formatHypothesis).join('\n') : 'No hypotheses yet.',
  ].join('\n');

/**
 * `investigation_hypotheses`: the candidate causes an investigation considered, one document per
 * space and conversation in `.kibana-investigation-hypotheses`, replaced as a whole on every
 * write. Origin and attachment id are the document id.
 */
export const hypothesesAttachment = defineInvestigationAttachment<
  typeof HYPOTHESES_ATTACHMENT_TYPE,
  HypothesesStorageSettings,
  HypothesesDocument
>({
  type: HYPOTHESES_ATTACHMENT_TYPE,
  storageSettings: hypothesesStorageSettings,
  schema: investigationHypothesesSchema,
  // The investigation overview shows hypotheses; the chat does not.
  hiddenInConversation: true,
  format: formatHypothesesForAgent,
  describe: () => 'Hypotheses',
  agentDescription:
    'Investigation hypotheses are the candidate causes the investigation considered, each investigating, dismissed, or confirmed, with a confidence and the evidence it rests on.\n\n' +
    'Rules:\n' +
    '- Update them with the `agentic_investigations.set_hypotheses` tool, sending the full list every time.\n' +
    "- The investigation's overview shows the hypotheses, not the chat; do not render them inline.",
});
