/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Benchmark cases for decision models. Each case has one question and the answer we expect.

const AGENT = 'Agent: Elastic AI Agent - Helps you investigate your data';

/** A shared-conversation decision input, laid out like buildTriggerDecisionInput. */
const conversation = ({ history = [], author = 'Jane Doe', message }) =>
  [
    AGENT,
    `Participants: ${[...new Set([...history.map(([who]) => who), author])].join(', ')}`,
    'Recent messages:',
    ...history.map(([who, text]) => `[${who}]: ${text}`),
    `New message from ${author}:`,
    message,
  ].join('\n');

const SHOULD_RESPOND = {
  type: 'predicate',
  instructions:
    'This is a shared conversation between people and an AI agent. Decide whether the AI agent should respond to the new message. Answer true when the message asks the agent something, asks for its help or opinion, or is directed at it, including through an @mention of the agent. Answer false when the message is directed at other people, is a reaction or acknowledgement, or does not need the agent.',
};

const PICK_SKILL = {
  type: 'choice',
  instructions: 'Pick the skill the agent should load to handle this request.',
  choices: {
    observability: 'Logs, metrics, traces, APM and service health',
    security: 'Security alerts, detections, threats and cases',
    search: 'Finding documents or records in indices',
    none: 'Small talk or anything no skill helps with',
  },
};

const REASONING_EFFORT = {
  type: 'score',
  instructions: 'How much reasoning effort does the agent need to answer this request well?',
  levels: [
    { label: 'low', description: 'A simple lookup or a one-step answer' },
    { label: 'medium', description: 'A few steps or some analysis' },
    { label: 'high', description: 'A multi-step investigation across several data sources' },
  ],
};

const earlierExchange = [
  ['Bruno Farache', 'Deploy 4.2 went out at 14:00'],
  ['Jane Doe', '@Elastic AI Agent can you keep an eye on the error rates?'],
  ['Elastic AI Agent', "Sure, I'll flag anything unusual in the error rates."],
];

export const cases = [
  // should_respond (predicate): expected is true (respond) or false (stay quiet)
  {
    id: 'P1',
    label: 'Direct question to the agent',
    question: ['should_respond', SHOULD_RESPOND],
    input: conversation({
      history: earlierExchange,
      message: '@Elastic AI Agent can you check why checkout latency spiked?',
    }),
    expected: true,
  },
  {
    id: 'P2',
    label: '"@agent do not reply to this"',
    question: ['should_respond', SHOULD_RESPOND],
    input: conversation({
      history: earlierExchange,
      message: "@Elastic AI Agent do not reply to this, it's just for the record",
    }),
    expected: false,
  },
  {
    id: 'P3',
    label: 'Message for a person',
    question: ['should_respond', SHOULD_RESPOND],
    input: conversation({
      history: earlierExchange,
      message: '@Bruno Farache can you look at this when you are back?',
    }),
    expected: false,
  },
  {
    id: 'P4',
    label: 'Follow-up for the agent, no mention',
    question: ['should_respond', SHOULD_RESPOND],
    input: conversation({
      history: earlierExchange,
      message: 'What was the p99 latency for checkout in the last hour?',
    }),
    expected: true,
  },
  {
    id: 'P5',
    label: '"thanks!" after the agent answered',
    question: ['should_respond', SHOULD_RESPOND],
    input: conversation({ history: earlierExchange, message: 'thanks!' }),
    expected: false,
  },
  {
    id: 'P6',
    label: 'Mentions the agent, but for later',
    question: ['should_respond', SHOULD_RESPOND],
    input: conversation({
      history: earlierExchange,
      message: "Bruno, let's ask the agent about the refunds tomorrow",
    }),
    expected: false,
  },

  // pick_skill (choice): expected is the choice
  {
    id: 'C1',
    label: 'Latency spike',
    question: ['pick_skill', PICK_SKILL],
    input: 'Why is checkout latency spiking since this morning?',
    expected: 'observability',
  },
  {
    id: 'C2',
    label: 'Detection alerts',
    question: ['pick_skill', PICK_SKILL],
    input: 'Are there any critical detection alerts from last night?',
    expected: 'security',
  },
  {
    id: 'C3',
    label: 'Find documents',
    question: ['pick_skill', PICK_SKILL],
    input: 'Find the support tickets that mention a refund',
    expected: 'search',
  },
  {
    id: 'C4',
    label: 'Small talk',
    question: ['pick_skill', PICK_SKILL],
    input: 'Good morning team!',
    expected: 'none',
  },
  {
    id: 'C5',
    label: 'Failed logins (security or o11y?)',
    question: ['pick_skill', PICK_SKILL],
    input: 'Is the spike in failed logins on the auth service an attack?',
    expected: 'security',
  },
  {
    id: 'C6',
    label: 'Slowest traces',
    question: ['pick_skill', PICK_SKILL],
    input: 'Show me the slowest traces for the payment API',
    expected: 'observability',
  },

  // reasoning_effort (score): expected is the level label
  {
    id: 'S1',
    label: 'Time in UTC',
    question: ['reasoning_effort', REASONING_EFFORT],
    input: 'What time is it in UTC?',
    expected: 'low',
  },
  {
    id: 'S2',
    label: 'Count errors',
    question: ['reasoning_effort', REASONING_EFFORT],
    input: 'How many errors did checkout log in the last hour?',
    expected: 'low',
  },
  {
    id: 'S3',
    label: 'Compare two services',
    question: ['reasoning_effort', REASONING_EFFORT],
    input:
      'Compare error rates for checkout and payment over the last week and tell me which got worse',
    expected: 'medium',
  },
  {
    id: 'S4',
    label: 'Root-cause investigation',
    question: ['reasoning_effort', REASONING_EFFORT],
    input:
      'Investigate why checkout latency spiked after deploy 4.2: check traces, logs and infra metrics, and find the root cause',
    expected: 'high',
  },
  {
    id: 'S5',
    label: "Summarize today's alerts",
    question: ['reasoning_effort', REASONING_EFFORT],
    input: "Summarize today's alerts",
    expected: 'medium',
  },
  {
    id: 'S6',
    label: '"Thanks!"',
    question: ['reasoning_effort', REASONING_EFFORT],
    input: 'Thanks!',
    expected: 'low',
  },
];
