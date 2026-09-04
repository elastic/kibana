/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { structuredPatch } from 'diff';
import type { ViewSpec } from '@kbn/adaptive-ui';
import { Diff, Text, View, toViewSpec } from '@kbn/adaptive-ui/jsx';

/**
 * The `workflow.yaml.diff` attachment payload ([workflow_yaml_diff_attachment_renderer.tsx](../../../../plugins/shared/agent_builder_workflows/public/attachment_types/workflow_yaml_diff_attachment_renderer.tsx)).
 */
export interface WorkflowYamlDiffData {
  beforeYaml: string;
  afterYaml: string;
  name?: string;
  status?: 'pending' | 'accepted' | 'declined';
}

type DiffLineKind = 'add' | 'remove' | 'context';
interface DiffHunk {
  header?: string;
  lines: Array<{ kind: DiffLineKind; content: string }>;
}

const lineKind = (line: string): DiffLineKind => {
  if (line.startsWith('+')) return 'add';
  if (line.startsWith('-')) return 'remove';
  return 'context';
};

/**
 * Converts a before/after YAML pair into Adaptive UI {@link DiffHunk}s via a
 * unified patch, so the `diff` primitive renders the same add/remove/context
 * lines the attachment's Monaco diff viewer shows.
 */
const toHunks = (before: string, after: string): DiffHunk[] =>
  structuredPatch('workflow.yaml', 'workflow.yaml', before, after, '', '').hunks.map((hunk) => ({
    header: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
    lines: hunk.lines.map((line) => ({ kind: lineKind(line), content: line.slice(1) })),
  }));

const countKind = (hunks: DiffHunk[], kind: DiffLineKind): number =>
  hunks.reduce((sum, hunk) => sum + hunk.lines.filter((line) => line.kind === kind).length, 0);

/**
 * Alternate rendering for the `workflow.yaml.diff` attachment: an added/removed
 * line count over a `diff` node of the change.
 */
export const toWorkflowYamlDiffViewSpec = ({
  beforeYaml,
  afterYaml,
  name,
}: WorkflowYamlDiffData): ViewSpec => {
  const hunks = toHunks(beforeYaml, afterYaml);
  const added = countKind(hunks, 'add');
  const removed = countKind(hunks, 'remove');
  return toViewSpec(
    <View
      title={name ? `${name} changes` : 'Workflow changes'}
      subtitle="Proposed edit"
    >
      <Text body={`+${added} added, -${removed} removed`} />
      {hunks.length === 0 ? (
        <Text body="No changes detected." tone="neutral" />
      ) : (
        <Diff title={name ?? 'Workflow changes'} language="yaml" hunks={hunks} />
      )}
    </View>
  ) as ViewSpec;
};

export const sampleWorkflowYamlDiff: WorkflowYamlDiffData = {
  name: 'Enrich and notify on new critical alert',
  status: 'pending',
  beforeYaml: [
    'steps:',
    '  - name: enrich-host',
    '    type: http',
    '  - name: post-to-slack',
    '    type: slack',
  ].join('\n'),
  afterYaml: [
    'steps:',
    '  - name: enrich-host',
    '    type: http',
    '  - name: post-to-slack',
    '    type: slack',
    '  - name: open-case',
    '    type: cases',
  ].join('\n'),
};
