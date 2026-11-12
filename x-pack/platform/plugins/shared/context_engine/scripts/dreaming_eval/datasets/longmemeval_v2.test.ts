/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LongMemEvalV2Config } from '../config';
import type { LmeV2Question, LmeV2Trajectory } from './longmemeval_v2';
import {
  chromeOf,
  describePage,
  pageElements,
  selectQuestions,
  selectTrajectoryIds,
  targetsOf,
  trajectoryIdOfLine,
  haystackFileOf,
  trajectoryToConversation,
} from './longmemeval_v2';

const options: LongMemEvalV2Config = {
  base_url: 'https://example.com',
  agent: { id: 'workarena-agent', name: 'ServiceNow agent' },
  samples: [],
  presets: {},
  sample_count: 1,
  all_samples: true,
  per_sample: false,
  haystack: 'small',
  environments: [],
  max_trajectories: 2,
  max_observation_chars: 600,
  include_abstention: false,
  include_image_questions: false,
  start_time: '2026-01-05T09:00:00.000Z',
};

const ENTERPRISE = 'longmemeval_v2_enterprise';
const WEB = 'longmemeval_v2_web';

const question = (id: string, overrides: Partial<LmeV2Question> = {}): LmeV2Question => ({
  id,
  domain: 'enterprise',
  environment: 'workarena',
  question_type: 'procedure',
  question: `Question ${id}?`,
  image: null,
  answer: `Answer ${id}`,
  eval_function: 'norm_phrase_set_match',
  ...overrides,
});

const tree = (title: string, content: string[]) =>
  [
    `RootWebArea '${title}'`,
    "\t[55] navigation 'Global skip links', visible",
    "\t\t[78] button 'All', clickable, visible, expanded=False",
    ...content.map((line) => `\t\t${line}`),
    "\t[46] generic, live='assertive'",
  ].join('\n');

describe('LongMemEval-V2', () => {
  it("imports the samples' haystacks, in order and once, each up to max_trajectories", () => {
    const haystack = { a: ['t1', 't2'], b: ['t2', 't3', 't4'] };
    const samples = [question('a'), question('b')];

    expect(selectTrajectoryIds(samples, haystack, options)).toEqual(['t1', 't2', 't3']);
    expect(
      selectTrajectoryIds(samples, haystack, { ...options, max_trajectories: undefined })
    ).toEqual(['t1', 't2', 't3', 't4']);
    expect(selectTrajectoryIds([question('a')], haystack, options)).toEqual(['t1', 't2']);
  });

  it('picks the first samples, or the listed ones, among the questions of its domain', () => {
    const questions = [question('a'), question('b'), question('w', { domain: 'web' })];
    const ids = (selected: LmeV2Question[]) => selected.map(({ id }) => id);

    expect(ids(selectQuestions(questions, { ...options, all_samples: false }, ENTERPRISE))).toEqual(
      ['a']
    );
    expect(ids(selectQuestions(questions, { ...options, samples: ['b'] }, ENTERPRISE))).toEqual([
      'b',
    ]);
    expect(() => selectQuestions(questions, { ...options, samples: ['w'] }, ENTERPRISE)).toThrow(
      'longmemeval_v2_enterprise has no samples w'
    );
    expect(ids(selectQuestions(questions, options, WEB))).toEqual(['w']);
  });

  it('takes only the questions about the listed environments', () => {
    const questions = [
      question('r', { domain: 'web', environment: 'webarena-reddit' }),
      question('c', { domain: 'web', environment: 'webarena-cms' }),
      question('s', { domain: 'web', environment: 'webarena-onestopshop' }),
    ];
    const ids = (selected: LmeV2Question[]) => selected.map(({ id }) => id);

    expect(
      ids(
        selectQuestions(
          questions,
          { ...options, environments: ['webarena-reddit', 'webarena-onestopshop'] },
          WEB
        )
      )
    ).toEqual(['r', 's']);
    expect(
      ids(
        selectQuestions(
          questions,
          { ...options, environments: ['webarena-cms'], samples: ['r'] },
          WEB
        )
      )
    ).toEqual(['r']);
  });

  it('targets questions without images or abstention unless asked', () => {
    const questions = [
      question('a'),
      question('abs', { question_type: 'procedure-abs' }),
      question('img', { image: 'question_screenshots/img.png' }),
      question('w', { domain: 'web' }),
    ];

    expect(selectQuestions(questions, options, ENTERPRISE).map(({ id }) => id)).toEqual(['a']);
    expect(
      selectQuestions(
        questions,
        { ...options, include_abstention: true, include_image_questions: true },
        ENTERPRISE
      ).map(({ id }) => id)
    ).toEqual(['a', 'abs', 'img']);
    expect(targetsOf([question('w', { domain: 'web' })], WEB)[0].dataset).toBe(
      'longmemeval_v2_web'
    );
    expect(targetsOf([question('a')], ENTERPRISE)).toEqual([
      {
        id: 'a',
        dataset: 'longmemeval_v2_enterprise',
        category: 'procedure',
        question: 'Question a?',
        answer: 'Answer a',
      },
    ]);
  });

  it('reads the haystack file of each tier', () => {
    expect(haystackFileOf('small')).toBe('lme_v2_small.json');
    expect(haystackFileOf('medium')).toBe('lme_v2_medium.json');
  });

  it('reads the id at the start of a trajectories line', () => {
    expect(trajectoryIdOfLine('{"id": "00332982", "domain": "enterprise"}')).toBe('00332982');
    expect(trajectoryIdOfLine('{"domain": "enterprise", "id": "x"}')).toBeUndefined();
  });

  it('describes a page by its URL and labelled elements, without the chrome on every page', () => {
    const pages = [
      pageElements(tree('Home | ServiceNow', ["[90] heading 'Welcome'"])),
      pageElements(tree('Incidents | ServiceNow', ["[91] button 'Filters'"])),
      pageElements(tree('Problems | ServiceNow', ["[92] link 'New'"])),
    ];
    const chrome = chromeOf(pages);

    expect(pages[1]).toEqual([
      "RootWebArea 'Incidents | ServiceNow'",
      "navigation 'Global skip links'",
      "button 'All'",
      "button 'Filters'",
    ]);
    expect(describePage('https://sn.example.com/incident_list.do', pages[1], chrome, 600)).toBe(
      "URL: https://sn.example.com/incident_list.do\nRootWebArea 'Incidents | ServiceNow'\nbutton 'Filters'"
    );
    expect(describePage(undefined, pages[1], chrome, 20)).toBe("RootWebArea 'Inciden […]");
    expect(chromeOf(pages.slice(0, 2))).toEqual(new Set());
  });

  it('makes a trajectory one round: the goal, a tool call per action with the page it led to, and how it ended', () => {
    const trajectory: LmeV2Trajectory = {
      id: 't1',
      domain: 'enterprise',
      environment: 'workarena',
      goal: 'Order a Dell XPS developer laptop\n\nWith the largest SSD.',
      outcome: 'success',
      start_url: 'https://sn.example.com/home',
      states: [
        {
          state_index: 0,
          url: 'https://sn.example.com/home',
          action: null,
          thought: 'I will open the service catalog.',
          accessibility_tree: tree('Home | ServiceNow', []),
        },
        {
          state_index: 1,
          url: 'https://sn.example.com/catalog',
          action: "click('113')",
          thought: 'The catalog is open; the order is placed.',
          accessibility_tree: tree('Service Catalog | ServiceNow', ["[93] link 'Hardware'"]),
        },
        {
          state_index: 2,
          url: 'https://sn.example.com/catalog',
          action: null,
          thought: null,
          accessibility_tree: tree('Service Catalog | ServiceNow', []),
        },
      ],
    };

    expect(trajectoryToConversation(trajectory, 2, options)).toEqual({
      id: 't1',
      title: 'Order a Dell XPS developer laptop',
      rounds: [
        {
          startedAt: '2026-01-05T11:00:00.000Z',
          user: trajectory.goal,
          steps: [
            {
              thought: 'I will open the service catalog.',
              tool: 'browser',
              arguments: '{"action":"click(\'113\')"}',
              result:
                "URL: https://sn.example.com/catalog\nRootWebArea 'Service Catalog | ServiceNow'\nlink 'Hardware'",
            },
          ],
          answer: 'The task ended in success.',
        },
      ],
    });
  });
});
