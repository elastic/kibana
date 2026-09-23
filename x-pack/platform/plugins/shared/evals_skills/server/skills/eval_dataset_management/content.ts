/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_EXAMPLES_PER_DATASET } from '@kbn/evals-common';
import { evalsDatasetTools } from './tools/tool_utils';

/**
 * Guidance shown to the agent when the eval-dataset-management skill is loaded.
 * It documents the tools and the recommended discover -> preview -> write flow.
 */
export const EVAL_DATASET_MANAGEMENT_SKILL_CONTENT = `## When to Use This Skill

Use this skill when the user wants to **manage evaluation datasets** with the
Evaluations (evals) feature: finding and inspecting them, creating them, replacing
their examples, copying them, or deleting them.

Do **not** use this skill to compose or run evaluation experiments.

## Core Concepts

A **dataset** has a name unique in the space, a description, optional tags, an optional
maturity (\`raw\`, \`cleaned\`, or \`golden\`), and examples.

An **example** is \`{ input, output, metadata? }\`. \`input\` is what gets sent to the
target. \`output\` is the expected output. A dataset holds at most ${MAX_EXAMPLES_PER_DATASET}
examples.

Datasets belong to the current space and may also be shared with other spaces.

## Building Examples

Build examples from whatever the user points at: this conversation, Elasticsearch or
ES|QL results, traces, or Agent Builder conversations, using the other tools available
to you. Never invent an expected \`output\` the user has not provided or approved.

## Ask, Don't Assume

Never guess a dataset name, which dataset to change, or which one to delete, and never
silently auto-pick the first (or only) candidate a discovery tool returns.

Resolve datasets with \`${evalsDatasetTools.listDatasets}\`. When you ask the user to
choose, present up to **5** options as \`name (id)\` and invite them to type a different
value or ask to see more. If the tool returns exactly one candidate, propose it and wait
for the user to confirm.

## Recommended Flow

1. **Discover** with \`${evalsDatasetTools.listDatasets}\` (id, name, description, tags,
   maturity, example count). Use \`${evalsDatasetTools.getDataset}\` to read a dataset's
   examples before changing it.
2. **Draft** a short bulleted preview before any write: name, description, tags, maturity,
   example count, and the first few examples. For an upsert, say which examples will be
   added and which existing ones will be removed.
3. **Write**. Each of these asks the user to confirm before it runs:
   - \`${evalsDatasetTools.createDataset}\` - create a dataset. Fails if the name already exists in this space.
   - \`${evalsDatasetTools.upsertDataset}\` - create or replace by **name**. Replaces the whole example set: any existing example missing from the payload is removed.
   - \`${evalsDatasetTools.copyDataset}\` - copy a dataset under a new name.
   - \`${evalsDatasetTools.deleteDataset}\` - remove a dataset from this space.

## Rules

- Prefer \`${evalsDatasetTools.createDataset}\` for a new dataset. \`${evalsDatasetTools.upsertDataset}\` replaces the full example set, so read the current examples first and include every one that should be kept.
- If \`${evalsDatasetTools.getDataset}\` reports \`examples_omitted\` greater than 0, that list is incomplete. Do not send it to \`${evalsDatasetTools.upsertDataset}\`. Upsert only with the complete example set.
- Deleting a dataset shared with other spaces only detaches it from the current space. Pass \`intent: 'delete'\` only when the user wants it destroyed, and \`intent: 'unshare'\` only when they want it removed from this space and kept elsewhere. Omit \`intent\` to let the dataset's spaces decide.
- Summaries use a short **bulleted list**, not a markdown table.
`;
