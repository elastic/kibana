/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DecisionTreeTurnKind } from './types';
import abstractionRulesText from './abstraction_rules.text';
import formatGuideText from './format_guide.text';
import { MAX_DROPPED_NODE_RATIO, MIN_RETAINED_SIZE_RATIO } from './guardrails';
import mergeDisciplineText from './merge_discipline.text';
import reinforcementSystemText from './reinforcement_system.text';
import scriptFollowupExtendText from './script_followup_extend.text';
import scriptInitialCreateText from './script_initial_create.text';
import scriptInitialMergeText from './script_initial_merge.text';
import scriptReinforceText from './script_reinforce.text';
import { DECISION_TREE_DIRECTORY } from './symptom';

/**
 * Registered tool ids interpolated into the reinforcement prompts.
 *
 * The shared package must not import plugin tool constants; the plugin passes the ids it
 * actually registers so the prompt and the allow list cannot drift.
 */
export interface DecisionTreePromptTools {
  viewFileTool: string;
  strReplaceTool: string;
  writeFileTool: string;
  submitTool: string;
  recordSystemTool: string;
  recordToolTool: string;
  recordRemediationTool: string;
}

export interface DecisionTreeTurnScripts {
  initialMerge: string;
  initialCreate: string;
  followupExtend: string;
  reinforce: string;
}

/**
 * Canonical authoring contract for decision-tree Mermaid.
 *
 * The node *shape* encodes the node type, so an agent told only "write Mermaid" falls back to
 * default conventions and emits nothing but evidence and decision nodes, never symptom
 * (`([...])`) or end (`((...))`) nodes. This text and the shapes `parseMermaidDecisionTree`
 * recognizes are one contract and must not drift apart.
 */
export const DECISION_TREE_FORMAT_GUIDE = formatGuideText.trimEnd();

/**
 * Size discipline for the tree.
 *
 * Without this, a tree grows one node per tool call and stops being reusable: it records what
 * this investigation did instead of how to investigate this symptom.
 */
export const DECISION_TREE_ABSTRACTION_RULES = abstractionRulesText.trimEnd();

/**
 * Node-reuse and overlap-collapsing rules, shared so the merge path and the file-editing
 * agent path grow trees the same way instead of accumulating near-duplicate branches.
 */
export const DECISION_TREE_MERGE_DISCIPLINE = mergeDisciplineText.trimEnd();

/** Replaces `{{known_key}}` only. Mermaid `{{label}}` / `{{...}}` stay untouched. */
const fillTemplate = (template: string, vars: Record<string, string>): string =>
  template.replace(/\{\{([a-z0-9_]+)\}\}/g, (match, key: string) =>
    key in vars ? vars[key] : match
  );

const toolVars = (tools: DecisionTreePromptTools): Record<string, string> => ({
  view_file_tool: tools.viewFileTool,
  str_replace_tool: tools.strReplaceTool,
  write_file_tool: tools.writeFileTool,
  submit_tool: tools.submitTool,
  record_system_tool: tools.recordSystemTool,
  record_tool_tool: tools.recordToolTool,
  record_remediation_tool: tools.recordRemediationTool,
  decision_tree_directory: DECISION_TREE_DIRECTORY,
});

/** Builds the reinforcement agent's system prompt from the registered tool ids. */
export const buildReinforcementSystemPrompt = (tools: DecisionTreePromptTools): string => {
  const droppedNodePercent = String(MAX_DROPPED_NODE_RATIO * 100);
  const retainedSizePercent = String(MIN_RETAINED_SIZE_RATIO * 100);

  return fillTemplate(reinforcementSystemText, {
    ...toolVars(tools),
    dropped_node_percent: droppedNodePercent,
    retained_size_percent: retainedSizePercent,
    merge_discipline: DECISION_TREE_MERGE_DISCIPLINE,
    abstraction_rules: DECISION_TREE_ABSTRACTION_RULES,
    format_guide: DECISION_TREE_FORMAT_GUIDE,
  }).trimEnd();
};

/**
 * System prompt for producing a whole tree in one structured-output call, rather than by editing
 * a file in the sandbox.
 *
 * This is the same body of rules the file-editing agent runs under, minus the tool scaffolding.
 * Sharing the constants is what keeps an evaluation of this path honest about the agent's.
 */
export const buildDecisionTreePlanSystemPrompt = (mode: 'extract' | 'reinforce'): string => {
  const intro =
    mode === 'extract'
      ? `You extract a reusable investigation decision tree from a completed investigation.

The tree captures the methodology that proved effective so it can be reapplied to a similar problem later. It must NOT record this investigation's specific findings or outcomes.`
      : `You maintain investigation decision trees. You are given an existing tree and a causal analysis describing a confirmed root cause, and must update the tree to mark the verified causal path and apply any structural edits the analysis calls for.`;

  return `${intro}

Identify the tree by \`symptom\`: a stable kebab-case slug of 2-5 words using only letters, digits and hyphens, naming the symptom being diagnosed. No environment, region, team or timestamp.

${DECISION_TREE_ABSTRACTION_RULES}

${DECISION_TREE_MERGE_DISCIPLINE}

${DECISION_TREE_FORMAT_GUIDE}`;
};

/** Interpolates the four per-turn scripts with the registered tool ids. */
export const buildTurnScripts = (tools: DecisionTreePromptTools): DecisionTreeTurnScripts => {
  const vars = toolVars(tools);
  return {
    initialMerge: fillTemplate(scriptInitialMergeText, vars).trimEnd(),
    initialCreate: fillTemplate(scriptInitialCreateText, vars).trimEnd(),
    followupExtend: fillTemplate(scriptFollowupExtendText, vars).trimEnd(),
    reinforce: fillTemplate(scriptReinforceText, vars).trimEnd(),
  };
};

/**
 * Picks the turn script for this round. An initial investigation either seeds a brand new tree
 * or merges into whichever trees were hydrated; a later turn either reinforces a confirmed root
 * cause or extends the tree without claiming causality.
 */
export const selectTurnScript = ({
  turnKind,
  causalConfirmed,
  hasExistingTrees,
  tools,
}: {
  turnKind: DecisionTreeTurnKind;
  causalConfirmed: boolean;
  hasExistingTrees: boolean;
  tools: DecisionTreePromptTools;
}): string => {
  const scripts = buildTurnScripts(tools);
  if (turnKind === 'initial_investigation') {
    return hasExistingTrees ? scripts.initialMerge : scripts.initialCreate;
  }
  return causalConfirmed ? scripts.reinforce : scripts.followupExtend;
};

/** Builds the per-turn user message that states what the agent may edit and what it knows. */
export const buildTurnPrompt = ({
  editableTreePaths,
  activeSystemLearnings,
  activeToolLearnings,
  activeRemediations,
  connectorNames,
  referencedMemories,
  script,
}: {
  editableTreePaths: string[];
  activeSystemLearnings: string[];
  activeToolLearnings: string[];
  activeRemediations?: string[];
  connectorNames: string[];
  referencedMemories?: string;
  script: string;
}): string => {
  const bulletsOrNone = (items: string[]): string =>
    items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- None';

  return `Decision-tree files available for edit:
${bulletsOrNone(editableTreePaths)}

Active learnings for retention decisions:
- system:
${bulletsOrNone(activeSystemLearnings)}
- tool:
${bulletsOrNone(activeToolLearnings)}
- remediation:
${bulletsOrNone(activeRemediations ?? [])}

Enabled connectors:
${connectorNames.length > 0 ? connectorNames.join(', ') : 'None'}

Referenced memories:
${referencedMemories || 'None'}

${script}
`;
};
