/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { codeBlock, descriptionList, view } from '@kbn/adaptive-ui/builders';
import type { BodyNode, ViewSpec } from '@kbn/adaptive-ui';

/**
 * The `workflow.yaml` attachment payload ([workflow_yaml_attachment_renderer.tsx](../../../../plugins/shared/agent_builder_workflows/public/attachment_types/workflow_yaml_attachment_renderer.tsx)).
 */
export interface WorkflowYamlData {
  yaml: string;
  workflowId?: string;
  name?: string;
}

interface ParsedWorkflow {
  name?: string;
  triggers?: unknown[];
  steps?: unknown[];
  tags?: string[];
}

const countOf = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

/**
 * Alternate rendering for the `workflow.yaml` attachment: a trigger/step/tag
 * summary parsed from the YAML over the definition as a highlighted `codeBlock`.
 * Falls back to the code block alone when the YAML cannot be parsed.
 */
export const toWorkflowYamlViewSpec = ({ yaml, name }: WorkflowYamlData): ViewSpec => {
  let parsed: ParsedWorkflow | undefined;
  try {
    parsed = parse(yaml) as ParsedWorkflow;
  } catch {
    parsed = undefined;
  }

  const body: BodyNode[] = [];
  if (parsed) {
    const details = [
      { title: 'Triggers', description: String(countOf(parsed.triggers)) },
      { title: 'Steps', description: String(countOf(parsed.steps)) },
    ];
    if (parsed.tags && parsed.tags.length > 0) {
      details.push({ title: 'Tags', description: parsed.tags.join(', ') });
    }
    body.push(descriptionList({ label: 'Workflow', layout: 'inline', items: details }));
  }
  body.push(codeBlock({ language: 'yaml', code: yaml, collapsible: true }));

  return view({ title: name ?? parsed?.name ?? 'Workflow', subtitle: 'Workflow definition', body });
};

export const sampleWorkflowYaml: WorkflowYamlData = {
  name: 'Enrich and notify on new critical alert',
  yaml: [
    'name: Enrich and notify on new critical alert',
    'tags:',
    '  - security',
    '  - enrichment',
    'triggers:',
    '  - type: alert',
    '    filter: "kibana.alert.severity: critical"',
    'steps:',
    '  - name: enrich-host',
    '    type: http',
    '  - name: post-to-slack',
    '    type: slack',
    '  - name: open-case',
    '    type: cases',
  ].join('\n'),
};
