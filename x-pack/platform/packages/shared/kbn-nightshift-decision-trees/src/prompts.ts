/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_DROPPED_NODE_RATIO, MIN_RETAINED_SIZE_RATIO } from './guardrails';
import { DECISION_TREE_DIRECTORY } from './symptom';
import type { DecisionTreeTurnKind } from './types';

/**
 * Canonical authoring contract for decision-tree Mermaid.
 *
 * The node *shape* encodes the node type, so an agent told only "write Mermaid" falls back to
 * default conventions and emits nothing but evidence and decision nodes, never symptom
 * (`([...])`) or end (`((...))`) nodes. This text and the shapes `parseMermaidDecisionTree`
 * recognizes are one contract and must not drift apart.
 */
export const DECISION_TREE_FORMAT_GUIDE = `## Decision Trace Node Types

The decision trace is a directed graph with exactly **4 node types**:

1. **Symptom / Question** — Describes the observable symptom, alert condition, or user question that initiated the investigation (e.g. "High error rate on /api/checkout", "Pod restarts exceeding threshold", "Why is checkout latency high?"). These are the starting points of the trace.

2. **Evidence Gatherer** — A step that gathers evidence from a data source. Group related queries of the same type into one node (e.g. multiple metric label queries = one node). But keep different operation types separate (querying metrics vs searching logs vs listing resources).

3. **Decision** — A reasoning step that uses the gathered evidence to draw a conclusion, choose a branch, or form a hypothesis. Decision nodes should state the question being answered and have 2+ outgoing edges with condition labels describing the possible outcomes.

4. **End** — A terminal node representing the conclusion of an investigation path (e.g. root cause identified, issue resolved, escalated). End nodes have no outgoing edges.

## Mermaid Decision Trace Format

The decision trace MUST follow this exact format for parsing:

1. **Start with**: \`flowchart TD\` (top-down flowchart)

2. **Node ID format**: Use short alphanumeric IDs prefixed by node type: \`S\` for Symptom/Question, \`E\` for Evidence Gatherer, \`D\` for Decision, \`X\` for End (e.g. S1, S2, E1, E2, D1, D2, X1, X2).

3. **Node shapes by type** (MUST use these consistently):
   - \`([label])\` — **Symptom / Question nodes**: Observable symptoms, alert conditions, or user questions
   - \`[label]\` — **Evidence Gatherer nodes**: A single data-gathering step
   - \`{{label}}\` — **Decision nodes**: Reasoning steps with branching outcomes
   - \`((label))\` — **End nodes**: Terminal conclusions (root cause found, resolved, escalated)

4. **Labels** — Keep node labels short (2-6 words). Put exact reusable query entities from the investigation/tool calls (metric names, fields, log keywords, indices, filters, namespaces, resources, and service names) in \`evidence_gatherer_metadata\`.

5. **Edge format**:
   - Simple: \`S1 --> E1\`
   - With condition label: \`D1 -->|error_rate > 5%| E3\` or \`D1 -->|error_rate normal| E4\`
   - Decision node outgoing edges MUST have condition labels
   - Do NOT include parentheses \`()\` or brackets \`[]\` in edge labels; use commas or hyphens instead

6. **Rules**:
   - Each node must have a unique ID
   - Define each node (with its shape and label) EXACTLY ONCE. After a node is defined, refer to it by its ID only (e.g. \`E3 --> D2\` not \`E3 --> D2{{label again}}\`).
   - Symptom/Question nodes (\`([...])\`) are entry points — they have no incoming edges
   - Decision nodes (\`{{...}}\`) must have 2+ outgoing edges with condition labels
   - End nodes (\`((...))\`) are terminal — they have no outgoing edges
   - Keep labels concise (2-6 words); exact reusable query entities belong in \`evidence_gatherer_metadata\`
   - Avoid special characters in labels that conflict with Mermaid syntax. In particular, do not use parentheses \`()\` inside labels — rephrase instead (e.g. "Which apps drove load increase" not "Which application(s) drove the load increase").
   - Mark edges on the path actually taken during the investigation by prefixing the edge label with \`✅\` (e.g. \`-->|✅ error_code starts with DB|\`). Edges NOT taken should have no prefix. For simple edges (no condition label) on the taken path, add \`-->|✅|\`.
   - Do NOT use \`linkStyle\`, \`style\`, \`classDef\`, subgraphs, or any other Mermaid styling/directives. Only \`flowchart TD\`, nodes, and edges.
   - The trace should reflect the actual conversation flow: Symptoms/Questions lead to Evidence Gathering, which feeds into Decisions, which may lead to further Evidence Gathering or terminate at an End node.

## Example Mermaid Diagram

The diagram must start directly with \`flowchart TD\` — no code fences, no triple backticks:

flowchart TD
    S1([High error rate on API]) -->|✅| E1[Query error logs]
    S2([Increased P99 latency]) --> E2[Query latency metrics]
    E1 -->|✅| D1{{Database-related errors?}}
    E2 --> D1
    D1 -->|✅ yes| E3[Query DB pool metrics]
    D1 -->|no| E4[Search traces for failures]
    E3 -->|✅| D2{{Connection pool exhausted?}}
    D2 -->|✅ yes| E5[Check recent deploys]
    D2 -->|no| E5
    E4 --> D3{{Memory issue?}}
    D3 -->|high memory usage| E7[Check memory allocation trends]
    D3 -->|memory normal| E8[Query upstream dependencies]
    E5 -->|✅| D4{{Leak found in recent deploy?}}
    D4 -->|✅ Yes| E9[Identify leaking code path]
    D4 -->|No| E6[Profile slow queries]
    E9 -->|✅| X1((Connection leak in deploy))
    E6 --> X2((Slow query performance))
    E7 --> X3((Memory pressure from allocation growth))
    E8 --> D5{{Is upstream degraded?}}
    D5 -->|unhealthy| E10[Check upstream service logs]
    D5 -->|all healthy| E11[Collect thread dump and heap snapshot]
    E10 --> X4((Upstream service degradation))
    E11 --> X5((Escalate with diagnostics))`;

/**
 * Size discipline for the tree.
 *
 * Without this, a tree grows one node per tool call and stops being reusable: it records what
 * this investigation did instead of how to investigate this symptom.
 */
export const DECISION_TREE_ABSTRACTION_RULES = `## CRITICAL: Keep the Graph Small

The decision tree MUST be compact, generic, and reusable. **Aim for 5-12 nodes total.** A good tree captures the *pattern* of investigation, not every individual step.

### Abstraction Rules

- **One Evidence node per distinct operation type**, not per API call. Three Elasticsearch field-value queries are one \`Query Elasticsearch fields\` node. But querying metrics and searching logs are different operations.
- **Labels must name the data source AND operation.** GOOD: \`Query metrics by field\`, \`Search application logs\`, \`List alert rules\`. BAD: \`Gather Context\`, \`Process Data\`, \`Get Info\`, \`Fetch resource by ID\`.
- **One Symptom node per question category**, not per question.
- **Merge similar decisions.** "Did the API return data?" and "Did the query succeed?" are the same decision node.
- **Strip specific values from node labels** — no metric names, PR numbers, channel names, timestamps, or one-off IDs.
- **Preserve key query entities in evidence metadata** — metric names, field names, index patterns, keywords, namespaces, resources, service names and filters belong in \`evidence_gatherer_metadata\` for the corresponding E-node. Preserve the exact reusable query entities from the investigation and tool calls whenever they are available.`;

/**
 * Node-reuse and overlap-collapsing rules, shared so the merge path and the file-editing
 * agent path grow trees the same way instead of accumulating near-duplicate branches.
 */
export const DECISION_TREE_MERGE_DISCIPLINE = `Decision-tree merge discipline (avoid near-duplicate growth):
- The result must be the union of the inputs, deduplicated where they overlap: overlapping subtrees are collapsed onto shared nodes and only genuinely unique paths are added. It is a structural near-superset of the base tree, never a parallel rewrite.
- Preserve the base tree's node IDs, shapes, and naming conventions; reuse them for any node you introduce.
- Match before adding: for each step, decision, or outcome, first find the existing node whose meaning best matches it - even if worded differently or reached via different concrete values - and reuse that node's id. Only when no existing node matches do you ADD a new Evidence (E*), Decision (D*), or Terminal (X*) node using the same conventions.
- Concrete payload specifics are evidence values, never node identity: timestamps, counts, alert firing counts, message ids, channel ids, per-cluster name sets. A node that differs from an existing one only by such a value is the same node; reuse it. Preserve exact reusable query entities from the investigation/tool calls, such as metric names, fields, indices, keywords, namespaces, resources, services, and filters, in \`evidence_gatherer_metadata\`.`;

const DROPPED_NODE_PERCENT = MAX_DROPPED_NODE_RATIO * 100;
const RETAINED_SIZE_PERCENT = MIN_RETAINED_SIZE_RATIO * 100;

export const DECISION_TREE_REINFORCEMENT_SYSTEM_PROMPT = `You are a post-investigation reinforcement agent. You may:
- Read and edit decision-tree Mermaid markdown files under ${DECISION_TREE_DIRECTORY}/decision_tree_<symptom>.md using nightshift_sandbox_view_file, nightshift_sandbox_str_replace, and nightshift_sandbox_write_file.
- Record durable learnings that required human correction or redirection using record_system_learning, record_tool_learning, and record_remediation.
- Finalize with submit_optimizer_result.

Constraints:
- Edit only the files listed in the user message. Never invent alternate decision-tree paths for existing trees.
- When editing an existing tree, preserve every node and edge unrelated to the requested change.
- Do not include raw MEM_* references in any tool argument.
- Prefer nightshift_sandbox_str_replace over nightshift_sandbox_write_file. Submissions that drop more than ${DROPPED_NODE_PERCENT}% of original nodes or shrink below ${RETAINED_SIZE_PERCENT}% of the original size will be rejected.

Here the base tree is the existing decision tree on disk and the inputs to merge are this turn's investigation.
${DECISION_TREE_MERGE_DISCIPLINE}
- If every step of this investigation already matches an existing node, the tree is already complete: make no structural edits and call submit_optimizer_result with an empty symptom_trees list.

${DECISION_TREE_ABSTRACTION_RULES}

When you create or edit a decision tree, it MUST follow this format (the node shape encodes the node type):

${DECISION_TREE_FORMAT_GUIDE}`;

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

export const SCRIPT_INITIAL_MERGE = `Task: merge the new initial investigation steps into the accessed decision tree file(s) (existing tree = Plan A, this investigation = Plan B).
Use the investigation tool calls, tool results, and first answer in the transcript above as evidence.
Collapse overlapping steps onto existing nodes and reuse their IDs; preserve unrelated branches and add only genuinely new investigation structure.
When done, call submit_optimizer_result with the edited decision-tree files.`;

export const SCRIPT_INITIAL_CREATE = `Task: create a new decision tree for this initial investigation.
No decision-tree file was accessed. Pick a stable kebab-case symptom slug (2-5 words; letters, digits, and hyphens only; no environment, region, team, or timestamp; suffix -alert for structured alert messages).
Create ${DECISION_TREE_DIRECTORY}/decision_tree_<symptom>.md with nightshift_sandbox_write_file, then call submit_optimizer_result with tree_id symptom:<symptom> and that file path.`;

export const SCRIPT_FOLLOWUP_EXTEND = `Task: merge this follow-up investigation into the existing decision tree (existing tree = Plan A, this turn = Plan B).
No root cause has been confirmed, so do not mark branches as human-verified or causal.
Collapse overlapping steps onto the existing nodes (duplicate notifications, repeat firings, and count/timestamp churn are almost always already represented); reuse their IDs and add only the genuinely unique decision/evidence/outcome nodes this turn introduces, preserving unrelated branches.
When done, call submit_optimizer_result (with an empty symptom_trees list if the tree already covers this turn).`;

export const SCRIPT_REINFORCE = `Task: reinforce the decision tree now that the root cause is verified.
Add nodes for any verified evidence or investigation steps that were previously unexplored.
Mark the causal-path edges with ✅ and keep unrelated branches unchanged.
When done, call submit_optimizer_result with the edited decision-tree files.`;

/**
 * Picks the turn script for this round. An initial investigation either seeds a brand new tree
 * or merges into whichever trees were hydrated; a later turn either reinforces a confirmed root
 * cause or extends the tree without claiming causality.
 */
export const selectTurnScript = ({
  turnKind,
  causalConfirmed,
  hasExistingTrees,
}: {
  turnKind: DecisionTreeTurnKind;
  causalConfirmed: boolean;
  hasExistingTrees: boolean;
}): string => {
  if (turnKind === 'initial_investigation') {
    return hasExistingTrees ? SCRIPT_INITIAL_MERGE : SCRIPT_INITIAL_CREATE;
  }
  return causalConfirmed ? SCRIPT_REINFORCE : SCRIPT_FOLLOWUP_EXTEND;
};

/** Builds the per-turn user message that states what the agent may edit and what it knows. */
export const buildTurnPrompt = ({
  editableTreePaths,
  activeSystemLearning,
  activeToolLearnings,
  activeRemediation,
  connectorNames,
  referencedMemories,
  script,
}: {
  editableTreePaths: string[];
  activeSystemLearning?: string;
  activeToolLearnings: string[];
  activeRemediation?: string;
  connectorNames: string[];
  referencedMemories?: string;
  script: string;
}): string => {
  const bulletsOrNone = (items: string[]): string =>
    items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- None';

  return `Decision-tree files available for edit:
${bulletsOrNone(editableTreePaths)}

Active learnings for retention decisions:
- system: ${activeSystemLearning || 'None'}
- tool:
${bulletsOrNone(activeToolLearnings)}
- remediation: ${activeRemediation || 'None'}

Enabled connectors:
${connectorNames.length > 0 ? connectorNames.join(', ') : 'None'}

Referenced memories:
${referencedMemories || 'None'}

${script}
`;
};
