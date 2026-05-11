/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowSchema } from '@kbn/workflows';
import { JsonModelSchema } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { parseWorkflowYamlToJSON } from '@kbn/workflows-yaml';
import { SML_SYSTEM_WORKFLOW_TEMPLATES } from './templates';

describe('SML system workflow templates', () => {
  it('ships an index-augmentation template and an index-crawl template', () => {
    const ids = SML_SYSTEM_WORKFLOW_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining(['workflow-sml-index-augmentation', 'workflow-sml-index-crawl'])
    );
  });

  it.each(SML_SYSTEM_WORKFLOW_TEMPLATES.map((t) => [t.id, t]))(
    'parses %s YAML against the WorkflowSchema',
    (_id, template) => {
      const result = parseWorkflowYamlToJSON(template.yaml, WorkflowSchema);
      if (!result.success) {
        throw new Error(`Failed to parse '${template.id}': ${result.error.message}`);
      }
      expect(result.success).toBe(true);
    }
  );

  it('tags every template with sml-system and sml', () => {
    for (const template of SML_SYSTEM_WORKFLOW_TEMPLATES) {
      const result = parseWorkflowYamlToJSON(template.yaml, WorkflowSchema);
      if (!result.success) {
        throw new Error(`Failed to parse '${template.id}'`);
      }
      const tags = (result.data as { tags?: string[] }).tags ?? [];
      expect(tags).toEqual(expect.arrayContaining(['sml-system', 'sml']));
    }
  });

  /**
   * Regression: `ai.agent`'s `schema:` parameter is validated against
   * `JsonModelRootShapeSchema`, which only allows `type: object` at the root.
   * If we accidentally used `type: array` (or omitted it) the strict zod
   * schema used by `createWorkflow` would silently drop the parsed workflow
   * and fall back to a `name: 'Untitled workflow'` placeholder in storage.
   */
  it('uses a root-`object` JSON Schema for every ai.agent schema parameter', () => {
    for (const template of SML_SYSTEM_WORKFLOW_TEMPLATES) {
      const result = parseWorkflowYamlToJSON(template.yaml, WorkflowSchema);
      if (!result.success) {
        throw new Error(`Failed to parse '${template.id}'`);
      }
      const schemas = collectAiAgentSchemas((result.data as { steps?: unknown[] }).steps);
      for (const schema of schemas) {
        const validation = JsonModelSchema.safeParse(schema);
        if (!validation.success) {
          throw new Error(
            `ai.agent schema in '${template.id}' is not a valid JsonModelSchema: ` +
              JSON.stringify(validation.error.issues)
          );
        }
      }
    }
  });

});

const collectAiAgentSchemas = (steps: unknown): unknown[] => {
  if (!Array.isArray(steps)) return [];
  const out: unknown[] = [];
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;
    const s = step as { type?: string; with?: { schema?: unknown }; steps?: unknown };
    if (s.type === 'ai.agent' && s.with?.schema !== undefined) {
      out.push(s.with.schema);
    }
    if (Array.isArray(s.steps)) {
      out.push(...collectAiAgentSchemas(s.steps));
    }
  }
  return out;
};
