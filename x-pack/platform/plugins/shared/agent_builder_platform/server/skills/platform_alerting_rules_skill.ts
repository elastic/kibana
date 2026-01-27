/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/agent-builder-common/skills';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { createToolProxy } from './utils/create_tool_proxy';

export const PLATFORM_ALERTING_RULES_SKILL: Skill = {
  namespace: 'platform.alerting_rules',
  name: 'Platform Alerting Rules',
  description: 'Find, create, and enable/disable alerting rules safely (no deletes)',
  content: `# Platform Alerting Rules

## What this skill does
Helps you inspect, create, and manage alerting rules safely.

## When to use
- The user wants to check a rule's configuration/health.
- The user wants to create a new alerting rule.
- The user explicitly wants a rule enabled or disabled.
- The user wants to know what rule types are available.

## Inputs to ask the user for
- **Rule id** (preferred) or identifying details (name, tag, rule type)
- For create: rule name, type, schedule, and parameters
- For enable/disable/create: an explicit "yes, do it" confirmation

## Tools and operations
- Use \`platform.core.alerting_rules\`:
  - \`find\`, \`get\`, \`list_types\` (read-only)
  - \`create\` (**requires \`confirm: true\`**)
  - \`set_enabled\` (**requires \`confirm: true\`**)

## Safe workflow for inspecting rules
1) \`find\` the rule(s) and confirm the exact target.
2) \`get\` and summarize what the rule does.

## Safe workflow for creating rules
1) \`list_types\` to show available rule types if the user is unsure.
2) Collect required info: name, alertTypeId, consumer, schedule, params.
3) Summarize what will be created and require confirmation.
4) Call \`create\` with \`confirm: true\`.

## Safe workflow for enable/disable
1) \`find\` or \`get\` the rule to confirm the exact target.
2) Restate the impact and require confirmation.
3) Call \`set_enabled\` with \`confirm: true\`.

## Common rule types
- \`metrics.alert.threshold\` - Metric threshold alerts
- \`logs.alert.document.count\` - Log threshold alerts
- \`.index-threshold\` - Index threshold alerts
- \`xpack.ml.anomaly_detection_alert\` - ML anomaly alerts
- \`apm.anomaly\` - APM anomaly alerts
- \`siem.queryRule\` - Security detection rules

Use \`list_types\` to discover all available rule types for the user's license and permissions.
`,
  tools: [createToolProxy({ toolId: platformCoreTools.alertingRules })],
};
