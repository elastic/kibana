/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const thirdPartyDashboardAuthoringSkill = defineSkillType({
  id: 'third-party-dashboard-authoring',
  name: 'third-party-dashboard-authoring',
  basePath: 'skills/platform/dashboard',
  description:
    'Persist a composed dashboard to Kibana via the dashboards REST API, using manage_dashboard API output.',
  content: `## When to Use This Skill

Use this skill after the manage_dashboard API returns a \`dashboardData\` object and you want to save the dashboard to Kibana so it appears in the Dashboards app.

## Saving the dashboard

The \`dashboardData\` object maps directly onto Kibana's dashboards REST API request body — the field names (\`title\`, \`description\`, \`panels\`, and each panel's \`type\`, \`id\`, \`config\`, and \`grid\`) are identical. Send the \`dashboardData\` object as the request body unchanged.

To create a new dashboard, POST to \`/api/dashboards\`:

\`\`\`bash
curl -s -X POST 'http://localhost:5601/api/dashboards' \\
  -H 'Content-Type: application/json' \\
  -H 'kbn-xsrf: true' \\
  -H 'elastic-api-version: 2023-10-31' \\
  -u elastic:changeme \\
  -d '<dashboardData object from the manage_dashboard response>'
\`\`\`

The response is \`{ "id": "<dashboardId>", "data": { ... }, "meta": { ... } }\`. Capture \`id\` — it identifies the saved dashboard and is required to update it later.

To update an existing dashboard, PUT to \`/api/dashboards/{id}\` with the captured \`id\` in the path (this upserts: it creates the dashboard at that \`id\` if it does not exist):

\`\`\`bash
curl -s -X PUT 'http://localhost:5601/api/dashboards/<dashboardId>' \\
  -H 'Content-Type: application/json' \\
  -H 'kbn-xsrf: true' \\
  -H 'elastic-api-version: 2023-10-31' \\
  -u elastic:changeme \\
  -d '<updated dashboardData object>'
\`\`\`

Notes:
- Only \`title\` is required; all other fields are optional.
- Each panel's \`config\` must be a valid configuration for that panel's \`type\` (for example, a Lens config for \`lens\` panels). Send panels exactly as returned by the manage_dashboard API.
- After a successful save, report the dashboard \`id\` to the user.
`,
});
