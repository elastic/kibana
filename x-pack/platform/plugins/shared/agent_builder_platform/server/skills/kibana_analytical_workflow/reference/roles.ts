/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReferencedContent } from '@kbn/agent-builder-server/skills/type_definition';

export const rolesReference: ReferencedContent = {
  relativePath: './reference',
  name: 'roles',
  content: `# Role Framing

Use this table to bias which field groups and question phrasing you emphasize for each role.
This is guidance, not a hard filter — do not exclude a field group just because it isn't listed
for the selected role.

| Role | Cares most about | Phrasing bias |
| --- | --- | --- |
| PM | Navigation, Event metadata, Health | Adoption, funnel drop-off, feature usage |
| Sales | User identity, License, Product | Expansion signals, usage by tier/segment |
| Engineering | Performance, Health, Infrastructure | Latency, error rate, resource usage |
| Security | Event metadata, User identity, Health | Anomalous access, failure patterns, outcomes |
| Infrastructure | Infrastructure, Cloud, Performance | Capacity, resource saturation, node health |
| UX | Navigation, Client/browser, Time | User flow, drop-off points, session patterns |
| Leadership | Time, Event metadata (rolled up) | High-level trend, adoption over time |
| Analyst | All groups equally | Balanced, exploratory framing across every group |

When presenting the 10 generated questions, order them so the role's top 2-3 concerns appear
first, but never drop a universal question type (volume, distribution, trend, comparison,
anomaly) to make room — all 5 types must appear regardless of role.`,
};
