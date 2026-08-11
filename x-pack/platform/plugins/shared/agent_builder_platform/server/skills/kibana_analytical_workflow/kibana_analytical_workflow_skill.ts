/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { fieldGroupsReference } from './reference/field_groups';
import { questionTemplatesReference } from './reference/question_templates';
import { rolesReference } from './reference/roles';

/**
 * Guides a user from a selected Kibana data view to role-aware analytical
 * questions, ES|QL/Dev Tools queries, and visualizations.
 *
 * This is the generic analytical workflow: it never assumes a specific index
 * or domain. Domain-specific framing (e.g. automatic migration analytics)
 * should be added as a separate, independently-selectable skill that layers
 * on top of this one's tools rather than being folded in here.
 */
export const kibanaAnalyticalWorkflowSkill = defineSkillType({
  id: 'kibana-analytical-workflow',
  name: 'kibana-analytical-workflow',
  basePath: 'skills/platform/analytics',
  description:
    'Guides a user from a selected Kibana data view/index to role-aware analytical ' +
    'questions, ES|QL/Dev Tools queries, and visualizations. Use when a user wants to ' +
    'explore or analyze data in a Kibana index or data view they select, especially ' +
    "when they don't already know what questions to ask, or ask to be walked through " +
    'analyzing an index.',
  content: `# Kibana Analytical Workflow

## When to Use This Skill

Use this skill when a user wants to explore or analyze data in a Kibana index/data view
they select, and either:
- They don't know what questions to ask yet, or
- They ask to be "walked through" analyzing an index, or
- They ask broad questions like "what can I learn from this index?" or "help me analyze my data".

Do **not** use this skill when:
- The user already has a specific ES|QL query or question in mind (use the ES|QL tools directly).
- The user is inside Discover analyzing current query results (use the discover-data-analysis skill).
- The user wants to build/update a dashboard directly (use the dashboard-management skill, after
  this skill's visualizations exist).

## Scope Rule (do not violate)

Every step below is scoped to exactly ONE data view/index the user selects, and its resolved
backing indices. Never broaden analysis to other indices unless the user explicitly changes
their selection. If the user has not yet selected one, step 1 is mandatory before anything else.

## The Flow

### 1. Select a data view

Ask which data view, index, or index pattern to analyze. Use \`${platformCoreTools.listIndices}\`
and/or \`${platformCoreTools.indexExplorer}\` to show the user their accessible options if they
don't already know the name. Do not proceed past this step without one concrete index/pattern.

### 2. Confirm a time range

Ask for a time range, defaulting to the last 7 days (\`now-7d\` to \`now\`) if the user has no
preference. If the index has no obvious time field, say so and proceed without time filtering.

### 3. Categorize the fields

Call \`${platformCoreTools.getIndexMapping}\` (and \`${platformCoreTools.indexExplorer}\` if useful)
on the selected index to get the actual list of fields present. The "field-groups" reference is
ONLY a pattern-matching heuristic (e.g. "fields ending in \`_at\` typically mean Time") — it is not
a checklist of fields that exist in this index. Never assume a field from the reference is present;
only classify fields the mapping call actually returned. For every real field from the mapping,
match its name/type against the field-groups reference's patterns to assign it to a semantic group.

Present this as a reference table: group number, group name, fields (only real, mapping-confirmed
fields), type, short description. This table is a reference, not an editing step — do not ask the
user to reorganize it.

Semantic groups: Time, Event metadata, Performance, User identity, Navigation, Environment,
Infrastructure, License, Cloud, Product, Client/browser, Health, Flags, Unclassified.

### 4. Ask for role + drill-down group

Ask two things together, as button-style choices, not open text:
- Role: PM, Sales, Engineering, Security, Infrastructure, UX, Leadership, or Analyst.
- ONE field group from step 3 to drill into first (Time is a valid choice too).

Other groups from the same index can still support the analysis later — the selected group is
just the primary lens, not an exclusive filter.

### 5. Generate exactly 10 analytical questions

Combine the 5 universal question types below with the selected role and field group (see the
"roles" and "question-templates" references for phrasing and ES|QL/Dev Tools shape patterns).
Always generate exactly 10 — no more, no fewer.

Universal question types (must all be represented):
1. How many / how much? (volume/count)
2. Most / least common? (distribution)
3. How does it change over time? (trend)
4. How does X compare to Y? (comparison/correlation)
5. Are there anomalies? (outlier detection)

For each question, produce: analytical type, primary field group, supporting field group(s),
example fields, stakeholder value (why this role cares), suggested visualization, a likely ES|QL
shape, and a Dev Tools query (ES|QL, Query DSL, or Query DSL with a painless script). Present all
10 as a table.

### 6. Refine until happy

After presenting the 10 questions, ask: "Is there anything you want to add or change before I
continue?" Offer to regenerate with their feedback. Repeat this loop until the user says they're
happy to continue. Do not skip straight to running queries.

### 7. Answer approved questions

For each question the user wants answered: validate that the fields it references exist on the
selected index (re-check against the mapping from step 3), then use
\`${platformCoreTools.generateEsql}\` to produce the ES|QL query and \`${platformCoreTools.executeEsql}\`
to run it against the selected index only. Explain the result in language suited to the selected
role — call out what's observed fact vs. your interpretation.

### 8. Visualize and hand off to dashboards

Use \`${platformCoreTools.createVisualization}\` to build the suggested visualization for each
answered question. To assemble multiple panels into a dashboard, use the **dashboard-management**
skill (do not try to build dashboard layout yourself) — hand off with a suggested semantic name:
\`{role} {field group} Analytics - {index/data view title}\` (e.g. "PM Navigation Analytics - logs-*").

## Domain packs

If the selected index/data view's name or fields suggest a specific product domain this agent has
a dedicated skill for (e.g. an automatic-migration-analytics skill for SIEM migration telemetry),
that skill will layer its own framing on top of the flow above — you do not need to special-case
domains yourself here. If no domain-specific skill applies, treat the analysis as fully generic.
`,
  referencedContent: [fieldGroupsReference, questionTemplatesReference, rolesReference],
  getRegistryTools: () => [
    platformCoreTools.listIndices,
    platformCoreTools.indexExplorer,
    platformCoreTools.getIndexMapping,
    platformCoreTools.generateEsql,
    platformCoreTools.executeEsql,
    platformCoreTools.search,
    platformCoreTools.createVisualization,
  ],
});
