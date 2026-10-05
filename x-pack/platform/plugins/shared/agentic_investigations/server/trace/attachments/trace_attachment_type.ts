/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRACE_ATTACHMENT_TYPE } from '../../../common/trace/constants';
import {
  investigationTraceSchema,
  type InvestigationTrace,
  type TraceStep,
} from '../../../common/trace/trace';
import {
  defineInvestigationAttachment,
  formatEvidenceForAgent,
} from '../../investigation_attachments';
import {
  traceStorageSettings,
  type TraceDocument,
  type TraceStorageSettings,
} from '../storage/trace_storage';

const indent = (text: string): string =>
  text
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

const formatStep = (
  { type, label, method, finding, outcome, decision_tree_node: node, evidence }: TraceStep,
  index: number
) =>
  [
    `${index + 1}. [${type}${node ? `, tree node ${node}` : ''}] ${label}`,
    method ? `  How: ${method}` : undefined,
    finding ? `  Found: ${finding}` : undefined,
    outcome ? `  Outcome: ${outcome}` : undefined,
    evidence ? `  Evidence:\n${indent(formatEvidenceForAgent(evidence))}` : undefined,
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');

/** Text the LLM sees: every step in order, with how it was checked, what it found, and where it led. */
export const formatTraceForAgent = ({
  conversationId,
  steps,
  decisionTree,
}: InvestigationTrace): string =>
  [
    '## Investigation trace',
    `Conversation: ${conversationId}`,
    decisionTree ? `Decision tree: ${decisionTree}` : undefined,
    steps.length > 0 ? steps.map(formatStep).join('\n') : 'No steps yet.',
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');

/**
 * `investigation_trace`: the route an investigation took (what it investigated, how, and in which
 * order), one document per space and conversation in `.kibana-investigation-trace`, replaced as a
 * whole on every write. Its steps use the node types of a Nightshift decision tree. Origin and
 * attachment id are the document id.
 */
export const traceAttachment = defineInvestigationAttachment<
  typeof TRACE_ATTACHMENT_TYPE,
  TraceStorageSettings,
  TraceDocument
>({
  type: TRACE_ATTACHMENT_TYPE,
  storageSettings: traceStorageSettings,
  schema: investigationTraceSchema,
  // The investigation overview shows the trace; the chat does not.
  hiddenInConversation: true,
  format: formatTraceForAgent,
  describe: () => 'Investigation trace',
  agentDescription:
    'The investigation trace is the route the investigation actually took: each step it investigated, how, what it found, and which branch that led to, in order, using decision tree node types (symptom, evidence_gatherer, decision, end).\n\n' +
    'Rules:\n' +
    '- Update it with the `investigations.set_trace` tool, sending every step every time.\n' +
    "- The investigation's overview shows the trace, not the chat; do not render it inline.",
});
