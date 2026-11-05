/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';
import type {
  AutoTriggerAgentKey,
  AutoTriggerMessage,
  AutoTriggerParticipant,
} from '../../src/auto_trigger/auto_trigger_client';

export type AutoTriggerExample = Example<
  {
    agent: AutoTriggerAgentKey;
    history: AutoTriggerMessage[];
    author: AutoTriggerParticipant;
    message: string;
  },
  { shouldRespond: boolean },
  { caseId: string; label: string }
>;

const toExample = ({
  caseId,
  label,
  agent,
  history,
  message,
  shouldRespond,
}: {
  caseId: string;
  label: string;
  agent: AutoTriggerAgentKey;
  history: AutoTriggerMessage[];
  message: string;
  shouldRespond: boolean;
}): AutoTriggerExample => ({
  input: { agent, history, author: 'jane', message },
  output: { shouldRespond },
  metadata: { caseId, label },
});

/** Bruno shares a deploy, then Jane asks the agent to watch it, and the agent really replies. */
const earlierExchange: AutoTriggerMessage[] = [
  { author: 'bruno', text: 'Deploy 4.2 went out at 14:00' },
  {
    author: 'jane',
    text: '@Elastic AI Agent can you keep an eye on the error rates?',
    runAgent: true,
  },
];

const greetings: AutoTriggerMessage[] = [
  { author: 'bruno', text: 'Morning all' },
  { author: 'jane', text: 'Morning!' },
];

/** Who the new message is for, and whether the agent should answer it. */
export const ADDRESSEE_EXAMPLES: AutoTriggerExample[] = [
  toExample({
    caseId: 'P1',
    label: 'Direct question to the agent',
    agent: 'elastic',
    history: earlierExchange,
    message: '@Elastic AI Agent can you check why checkout latency spiked?',
    shouldRespond: true,
  }),
  toExample({
    caseId: 'P2',
    label: '"@agent do not reply to this"',
    agent: 'elastic',
    history: earlierExchange,
    message: "@Elastic AI Agent do not reply to this, it's just for the record",
    shouldRespond: false,
  }),
  toExample({
    caseId: 'P3',
    label: 'Message for a person',
    agent: 'elastic',
    history: earlierExchange,
    message: '@Bruno Farache can you look at this when you are back?',
    shouldRespond: false,
  }),
  toExample({
    caseId: 'P4',
    label: 'Follow-up for the agent, no mention',
    agent: 'elastic',
    history: earlierExchange,
    message: 'What was the p99 latency for checkout in the last hour?',
    shouldRespond: true,
  }),
  toExample({
    caseId: 'P5',
    label: '"thanks!" after the agent answered',
    agent: 'elastic',
    history: earlierExchange,
    message: 'thanks!',
    shouldRespond: false,
  }),
  toExample({
    caseId: 'P6',
    label: 'Mentions the agent, but for later',
    agent: 'elastic',
    history: earlierExchange,
    message: "Bruno, let's ask the agent about the refunds tomorrow",
    shouldRespond: false,
  }),
];

/** Requests where only the agent's description decides. */
export const DESCRIPTION_EXAMPLES: AutoTriggerExample[] = [
  toExample({
    caseId: 'D1',
    label: 'In scope for observability',
    agent: 'observability',
    history: greetings,
    message: 'Can someone check the error rate for checkout?',
    shouldRespond: true,
  }),
  toExample({
    caseId: 'D2',
    label: 'Same request, HR agent',
    agent: 'hr',
    history: greetings,
    message: 'Can someone check the error rate for checkout?',
    shouldRespond: false,
  }),
  toExample({
    caseId: 'D3',
    label: 'In scope for HR',
    agent: 'hr',
    history: greetings,
    message: 'How many vacation days do I have left this year?',
    shouldRespond: true,
  }),
  toExample({
    caseId: 'D4',
    label: 'Same request, observability agent',
    agent: 'observability',
    history: greetings,
    message: 'How many vacation days do I have left this year?',
    shouldRespond: false,
  }),
  toExample({
    caseId: 'D5',
    label: 'Out of scope for both: lunch',
    agent: 'observability',
    history: greetings,
    message: "Who's up for lunch at 12:30?",
    shouldRespond: false,
  }),
  toExample({
    caseId: 'D6',
    label: '@mention, but outside its scope',
    agent: 'hr',
    history: greetings,
    message: '@HR Assistant why is checkout latency spiking?',
    shouldRespond: true,
  }),
];
