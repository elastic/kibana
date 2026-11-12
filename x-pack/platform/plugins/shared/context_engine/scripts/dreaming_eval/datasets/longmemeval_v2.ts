/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LongMemEvalV2Config } from '../config';
import type { EvalConversation, EvalStep, EvalTarget } from '../types';
import { pickSamples } from './samples';

export const LONGMEMEVAL_V2_ENTERPRISE_DATASET = 'longmemeval_v2_enterprise';

const DOMAIN = 'enterprise';

/** A line of `questions.jsonl`. */
export interface LmeV2Question {
  id: string;
  domain: string;
  environment: string;
  question_type: string;
  question: string;
  image: string | null;
  answer: string;
  eval_function: string;
}

/** A line of `trajectories.jsonl`. */
export interface LmeV2Trajectory {
  id: string;
  domain: string;
  environment: string;
  goal: string;
  outcome: string;
  start_url: string;
  states: Array<{
    state_index: number;
    url?: string | null;
    action?: string | null;
    thought?: string | null;
    accessibility_tree?: string | null;
  }>;
}

/** Haystack files map each question id to the trajectory ids a memory system gets for it. */
export type LmeV2Haystack = Record<string, string[]>;

/** Minutes between trajectories: more than the longest one takes as spans. */
const TRAJECTORY_SPACING_MINUTES = 60;

const TOOL_NAME = 'browser';

/**
 * The trajectories of the selected samples, in order and once: the union of their haystacks (in
 * the small tier every enterprise question shares one), cut to `max_trajectories` when set.
 */
export const selectTrajectoryIds = (
  questions: LmeV2Question[],
  haystack: LmeV2Haystack,
  { max_trajectories: limit }: LongMemEvalV2Config
): string[] => {
  const ids = new Set<string>();
  for (const question of questions) {
    for (const id of haystack[question.id] ?? []) {
      ids.add(id);
    }
  }
  return [...ids].slice(0, limit);
};

/** The samples to evaluate: enterprise questions, each asked over its haystack of trajectories. */
export const selectQuestions = (
  questions: LmeV2Question[],
  options: LongMemEvalV2Config
): LmeV2Question[] => {
  const enterprise = questions.filter(({ domain }) => domain === DOMAIN);
  return pickSamples(
    enterprise.filter(
      ({ question_type: type, image }) =>
        (options.include_abstention || !type.endsWith('-abs')) &&
        (options.include_image_questions || image === null)
    ),
    enterprise,
    ({ id }) => id,
    options,
    LONGMEMEVAL_V2_ENTERPRISE_DATASET
  );
};

/** The id at the start of a trajectories line, read without parsing a line of a megabyte or more. */
export const trajectoryIdOfLine = (line: string): string | undefined =>
  /^\{\s*"id"\s*:\s*"([^"]+)"/.exec(line)?.[1];

/** The labelled elements of an accessibility tree, as role and label without ids and states. */
export const pageElements = (tree: string | null | undefined): string[] =>
  (tree ?? '')
    .split('\n')
    .map((line) => /^\s*(?:\[\d+\]\s*)?([\w-]+) '([^']*)'/.exec(line))
    .flatMap((match) => (match && match[2].trim() ? [`${match[1]} '${match[2].trim()}'`] : []));

/** Share of a trajectory's pages an element is on to count as chrome, such as the navigation bar. */
const CHROME_SHARE = 0.8;
/** Pages a trajectory needs before chrome can be told from content. */
const CHROME_MIN_PAGES = 3;

/** The elements on most pages of a trajectory: the portal's chrome rather than the page's content. */
export const chromeOf = (pages: string[][]): Set<string> => {
  if (pages.length < CHROME_MIN_PAGES) {
    return new Set();
  }
  const counts = new Map<string, number>();
  for (const elements of pages) {
    for (const element of new Set(elements)) {
      counts.set(element, (counts.get(element) ?? 0) + 1);
    }
  }
  return new Set(
    [...counts].filter(([, count]) => count >= pages.length * CHROME_SHARE).map(([e]) => e)
  );
};

/**
 * A page the agent saw, kept short: the URL, then the page's labelled elements without the chrome,
 * up to `maxChars`.
 */
export const describePage = (
  url: string | null | undefined,
  elements: string[],
  chrome: Set<string>,
  maxChars: number
): string => {
  const page = [url ? `URL: ${url}` : '', ...elements.filter((element) => !chrome.has(element))]
    .filter(Boolean)
    .join('\n');
  return page.length > maxChars ? `${page.slice(0, maxChars)} […]` : page;
};

/**
 * One trajectory as a one-round conversation. The task goal is what the user sent. Each state
 * after the first is a browser tool call: the action that led to it, the agent's thought before
 * that action, and the page it opened. The answer is how the task ended.
 */
export const trajectoryToConversation = (
  trajectory: LmeV2Trajectory,
  order: number,
  { start_time: startTime, max_observation_chars: maxChars }: LongMemEvalV2Config
): EvalConversation => {
  const { states } = trajectory;
  const pages = states.map(({ accessibility_tree: tree }) => pageElements(tree));
  const chrome = chromeOf(pages);
  const steps: EvalStep[] = [];
  for (let i = 1; i < states.length; i++) {
    const { action, url } = states[i];
    if (action) {
      steps.push({
        thought: states[i - 1].thought ?? undefined,
        tool: TOOL_NAME,
        arguments: JSON.stringify({ action }),
        result: describePage(url, pages[i], chrome, maxChars),
      });
    }
  }
  const lastThought = states[states.length - 1]?.thought;
  const startedAt = new Date(
    Date.parse(startTime) + order * TRAJECTORY_SPACING_MINUTES * 60_000
  ).toISOString();
  const [firstLine = trajectory.id] = trajectory.goal.split('\n');
  return {
    id: trajectory.id,
    title: firstLine.length > 100 ? `${firstLine.slice(0, 100)}…` : firstLine,
    rounds: [
      {
        startedAt,
        user: trajectory.goal,
        steps,
        answer: [`The task ended in ${trajectory.outcome}.`, lastThought ?? ''].join(' ').trim(),
      },
    ],
  };
};

export const targetsOf = (questions: LmeV2Question[]): EvalTarget[] =>
  questions.map((question) => ({
    id: question.id,
    dataset: LONGMEMEVAL_V2_ENTERPRISE_DATASET,
    category: question.question_type,
    question: question.question,
    answer: question.answer,
  }));
