/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DECISION_TREE_FORMAT_GUIDE,
  DECISION_TREE_REINFORCEMENT_SYSTEM_PROMPT,
  SCRIPT_FOLLOWUP_EXTEND,
  SCRIPT_INITIAL_CREATE,
  SCRIPT_INITIAL_MERGE,
  SCRIPT_REINFORCE,
  buildTurnPrompt,
  selectTurnScript,
} from './prompts';

describe('selectTurnScript', () => {
  it('seeds a new tree when an initial investigation hydrated nothing', () => {
    expect(
      selectTurnScript({
        turnKind: 'initial_investigation',
        causalConfirmed: false,
        hasExistingTrees: false,
      })
    ).toBe(SCRIPT_INITIAL_CREATE);
  });

  it('merges into hydrated trees on an initial investigation', () => {
    expect(
      selectTurnScript({
        turnKind: 'initial_investigation',
        causalConfirmed: false,
        hasExistingTrees: true,
      })
    ).toBe(SCRIPT_INITIAL_MERGE);
  });

  it('reinforces once a root cause is confirmed', () => {
    expect(
      selectTurnScript({
        turnKind: 'feedback_reinforcement',
        causalConfirmed: true,
        hasExistingTrees: true,
      })
    ).toBe(SCRIPT_REINFORCE);
  });

  it('extends without claiming causality when nothing is confirmed', () => {
    expect(
      selectTurnScript({
        turnKind: 'feedback_reinforcement',
        causalConfirmed: false,
        hasExistingTrees: true,
      })
    ).toBe(SCRIPT_FOLLOWUP_EXTEND);
  });

  it('ignores hydrated trees once past the initial investigation', () => {
    expect(
      selectTurnScript({
        turnKind: 'feedback_reinforcement',
        causalConfirmed: true,
        hasExistingTrees: false,
      })
    ).toBe(SCRIPT_REINFORCE);
  });
});

describe('DECISION_TREE_REINFORCEMENT_SYSTEM_PROMPT', () => {
  it('states the guardrail thresholds the submit tool actually enforces', () => {
    expect(DECISION_TREE_REINFORCEMENT_SYSTEM_PROMPT).toContain('drop more than 30% of original');
    expect(DECISION_TREE_REINFORCEMENT_SYSTEM_PROMPT).toContain('shrink below 50% of the original');
  });

  it('embeds the node-shape contract the parser recognizes', () => {
    expect(DECISION_TREE_REINFORCEMENT_SYSTEM_PROMPT).toContain(DECISION_TREE_FORMAT_GUIDE);
  });

  it('names the symptom file convention rather than the legacy monitors path', () => {
    expect(DECISION_TREE_REINFORCEMENT_SYSTEM_PROMPT).toContain(
      'decision-trees/decision_tree_<symptom>.md'
    );
    expect(DECISION_TREE_REINFORCEMENT_SYSTEM_PROMPT).not.toContain('monitor');
  });
});

describe('DECISION_TREE_FORMAT_GUIDE', () => {
  it('documents all four node shapes', () => {
    for (const shape of ['([label])', '[label]', '{{label}}', '((label))']) {
      expect(DECISION_TREE_FORMAT_GUIDE).toContain(shape);
    }
  });
});

describe('buildTurnPrompt', () => {
  it('lists editable files and active learnings', () => {
    const prompt = buildTurnPrompt({
      editableTreePaths: ['symptom:checkout-latency: /workspace/decision-trees/x.md'],
      activeSystemLearning: 'Checkout writes before syncing.',
      activeToolLearnings: ['query_pattern, elasticsearch: Filter by service.name.'],
      activeRemediation: 'Roll back the pool-size change.',
      connectorNames: ['elasticsearch'],
      referencedMemories: undefined,
      script: SCRIPT_REINFORCE,
    });

    expect(prompt).toContain('- symptom:checkout-latency: /workspace/decision-trees/x.md');
    expect(prompt).toContain('- system: Checkout writes before syncing.');
    expect(prompt).toContain('- remediation: Roll back the pool-size change.');
    expect(prompt).toContain('Referenced memories:\nNone');
    expect(prompt).toContain(SCRIPT_REINFORCE);
  });

  it('renders None for every empty slot', () => {
    const prompt = buildTurnPrompt({
      editableTreePaths: [],
      activeToolLearnings: [],
      connectorNames: [],
      script: SCRIPT_INITIAL_CREATE,
    });

    expect(prompt).toContain('Decision-tree files available for edit:\n- None');
    expect(prompt).toContain('- system: None');
    expect(prompt).toContain('Enabled connectors:\nNone');
  });
});
