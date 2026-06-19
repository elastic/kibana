/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Bundled markdown shown until a dynamic source is wired (saved object, HTTP, or repo file).
 * Replace via `useWhyV2Markdown` when the content pipeline is ready.
 */
export const WHY_V2_DEFAULT_MARKDOWN = `## What's in preview

Alerting v2.0 is rolling out behind a feature flag. v1 and v2 run **in parallel**. Copy rules, verify behavior, and retire v1 when you are ready. v1 is not deprecated.

### Try it

- **Rules**: Create with ES|QL, Builder, or from Discover
- **Alerts**: Episode list and lifecycle timeline
- **Action policies**: Matchers, grouping, throttling, workflows
- **Execution history**: Policy and rule execution audit

### Technical foundations

- Rule events in \`.rule-events-*\` with consistent schema (\`data.*\`, \`episode.*\`, \`group_hash\`)
- User operations in \`.alert-actions\` for MTTR and compliance
- Recovery and no-data strategies explicit in the rule definition
- Index-level Elasticsearch security for RBAC (MVP path)

### Roadmap highlights

- Agent-assisted rule authoring
- Async enrichment via workflow LOOKUP joins
- Broader rules-on-rules and external alert import patterns

---

*This section will be replaced when a dynamic content source is connected.*
`;
