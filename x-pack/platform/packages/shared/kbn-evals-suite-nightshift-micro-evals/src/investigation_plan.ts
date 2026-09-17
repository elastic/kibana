/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const investigationPlanSchema = z.object({
  monitor_id: z
    .string()
    .describe(
      'The ID of the alert/investigation. This can be monitor_id, monitor slug, or a rule that triggered the alert.'
    ),
  applicability: z
    .string()
    .describe(
      'Describe when this plan should be applied. What types of alerts, symptoms, or scenarios indicate this plan is relevant?'
    ),
  category_identification: z
    .string()
    .describe(
      'How can an engineer identify that an alert belongs to this category? What are the key signals or patterns to look for?'
    ),
  decision_tree_mermaid: z
    .string()
    .describe(
      "Mermaid diagram of the decision tree. Must start directly with 'flowchart TD' — do NOT wrap in code fences."
    ),
  evidence_gatherer_metadata: z
    .array(z.string())
    .describe(
      "For EACH evidence_gatherer node in the decision tree, provide a string in the format '<node_id>: <description>' where node_id matches the Mermaid diagram ID (e.g. E1, E2) and description is a natural-language summary of the toolset/skill used, what data it gathers, and from which data sources. Include key query entities such as metric names, labels, log indexes, keywords, service names, namespaces, resources, and filters. Preserve the exact reusable query entities from the investigation/tool calls whenever they are available. Keep the corresponding Mermaid evidence-gatherer label concise. Example: 'E1: DatadogToolkit - Query container.cpu.usage grouped by pod and namespace for the alert time window'"
    )
    .default([]),
  keywords: z
    .array(z.string())
    .describe('A short list of keywords which can be used to search for this investigation plan.'),
});

export type InvestigationPlan = z.infer<typeof investigationPlanSchema>;
