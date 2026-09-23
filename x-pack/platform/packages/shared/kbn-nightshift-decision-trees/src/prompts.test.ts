/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DecisionTreePromptTools } from './prompts';
import {
  DECISION_TREE_FORMAT_GUIDE,
  buildReinforcementSystemPrompt,
  buildTurnPrompt,
  buildTurnScripts,
  selectTurnScript,
} from './prompts';

const TOOLS: DecisionTreePromptTools = {
  viewFileTool: 'view_file_tool_id',
  strReplaceTool: 'str_replace_tool_id',
  writeFileTool: 'write_file_tool_id',
  submitTool: 'submit_optimizer_result',
  recordSystemTool: 'record_system_learning',
  recordToolTool: 'record_tool_learning',
  recordRemediationTool: 'record_remediation',
};

describe('selectTurnScript', () => {
  const scripts = buildTurnScripts(TOOLS);

  it('seeds a new tree when an initial investigation hydrated nothing', () => {
    expect(
      selectTurnScript({
        turnKind: 'initial_investigation',
        causalConfirmed: false,
        hasExistingTrees: false,
        tools: TOOLS,
      })
    ).toBe(scripts.initialCreate);
  });

  it('merges into hydrated trees on an initial investigation', () => {
    expect(
      selectTurnScript({
        turnKind: 'initial_investigation',
        causalConfirmed: false,
        hasExistingTrees: true,
        tools: TOOLS,
      })
    ).toBe(scripts.initialMerge);
  });

  it('reinforces once a root cause is confirmed', () => {
    expect(
      selectTurnScript({
        turnKind: 'feedback_reinforcement',
        causalConfirmed: true,
        hasExistingTrees: true,
        tools: TOOLS,
      })
    ).toBe(scripts.reinforce);
  });

  it('extends without claiming causality when nothing is confirmed', () => {
    expect(
      selectTurnScript({
        turnKind: 'feedback_reinforcement',
        causalConfirmed: false,
        hasExistingTrees: true,
        tools: TOOLS,
      })
    ).toBe(scripts.followupExtend);
  });

  it('ignores hydrated trees once past the initial investigation', () => {
    expect(
      selectTurnScript({
        turnKind: 'feedback_reinforcement',
        causalConfirmed: true,
        hasExistingTrees: false,
        tools: TOOLS,
      })
    ).toBe(scripts.reinforce);
  });
});

describe('buildReinforcementSystemPrompt', () => {
  const prompt = buildReinforcementSystemPrompt(TOOLS);

  it('states the guardrail thresholds the submit tool actually enforces', () => {
    expect(prompt).toContain('drop more than 30% of original');
    expect(prompt).toContain('shrink below 50% of the original');
  });

  it('embeds the node-shape contract the parser recognizes', () => {
    expect(prompt).toContain(DECISION_TREE_FORMAT_GUIDE);
  });

  it('names the symptom file convention rather than the legacy monitors path', () => {
    expect(prompt).toContain('decision-trees/decision_tree_<symptom>.md');
    expect(prompt).not.toContain('monitor');
  });

  it('interpolates the registered tool ids and leaves no placeholders', () => {
    expect(prompt).toContain('view_file_tool_id');
    expect(prompt).toContain('str_replace_tool_id');
    expect(prompt).toContain('write_file_tool_id');
    expect(prompt).toContain('submit_optimizer_result');
    expect(prompt).toContain('record_system_learning');
    expect(prompt).toContain('record_tool_learning');
    expect(prompt).toContain('record_remediation');
    expect(prompt).not.toMatch(
      /\{\{(view_file_tool|str_replace_tool|write_file_tool|submit_tool|record_system_tool|record_tool_tool|record_remediation_tool|decision_tree_directory|dropped_node_percent|retained_size_percent|merge_discipline|abstraction_rules|format_guide)\}\}/
    );
  });

  it('does not rewrite Mermaid decision-node shape markers', () => {
    expect(prompt).toContain('`{{label}}`');
    expect(prompt).toContain('D1{{Database-related errors?}}');
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
  const scripts = buildTurnScripts(TOOLS);

  it('lists editable files and active learnings', () => {
    const prompt = buildTurnPrompt({
      editableTreePaths: ['symptom:checkout-latency: /workspace/decision-trees/x.md'],
      activeSystemLearnings: ['Checkout writes before syncing.', 'Redis is the session store.'],
      activeToolLearnings: ['query_pattern, elasticsearch: Filter by service.name.'],
      activeRemediations: ['symptom:checkout-high-latency: Roll back the pool-size change.'],
      connectorNames: ['elasticsearch'],
      referencedMemories: undefined,
      script: scripts.reinforce,
    });

    expect(prompt).toContain('- symptom:checkout-latency: /workspace/decision-trees/x.md');
    expect(prompt).toContain('- Checkout writes before syncing.');
    expect(prompt).toContain('- Redis is the session store.');
    expect(prompt).toContain('- symptom:checkout-high-latency: Roll back the pool-size change.');
    expect(prompt).toContain('Referenced memories:\nNone');
    expect(prompt).toContain(scripts.reinforce);
  });

  it('renders None for every empty slot', () => {
    const prompt = buildTurnPrompt({
      editableTreePaths: [],
      activeSystemLearnings: [],
      activeToolLearnings: [],
      connectorNames: [],
      script: scripts.initialCreate,
    });

    expect(prompt).toContain('Decision-tree files available for edit:\n- None');
    expect(prompt).toContain('- system:\n- None');
    expect(prompt).toContain('Enabled connectors:\nNone');
  });
});
