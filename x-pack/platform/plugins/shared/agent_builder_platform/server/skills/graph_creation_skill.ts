/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attachmentTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { GRAPH_ATTACHMENT_TYPE } from '../../common/attachments';

export const graphCreationSkill = defineSkillType({
  id: 'graph-creation',
  name: 'graph-creation',
  basePath: 'skills/platform/visualization',
  description:
    'Create graph attachments by transforming raw data into valid React Flow nodes and edges.',
  content: `## When to Use This Skill

Use this skill when:
- A user asks for relationship/dependency/topology/entity-link visualization.
- You need to represent raw records as nodes and edges and render them in-chat.
- You need a reusable graph attachment id for follow-up updates or comparisons.

Do **not** use this skill when:
- A chart/table/metric is more appropriate than a graph.
- There is no meaningful relationship data to connect entities.

## Available Tool

- **${attachmentTools.add}**: Create a new attachment in the conversation.

## Target Attachment Type

- Use attachment type: **${GRAPH_ATTACHMENT_TYPE}**
- Graph attachment data must follow the schema exactly:
  - \`nodes\`: array of node objects (required)
    - each node must include:
      - \`id\`: non-empty string
      - \`position\`: object with numeric \`x\` and \`y\`
      - \`data\`: object with required string \`label\`
  - \`edges\`: array of edge objects (required)
    - each edge must include:
      - \`id\`: non-empty string
      - \`source\`: non-empty string node id
      - \`target\`: non-empty string node id
      - \`type\`: non-empty string edge type
      - optional \`label\`: human-readable edge label
      - optional \`markerEnd\`: \`"arrow"\` when you want a directional arrow marker
  - optional: \`title\`, \`description\`

## Raw Data to Graph Workflow

1. **Identify entities and relationships**
   - Decide what becomes a node (service, host, user, process, endpoint, etc.).
   - Decide what becomes an edge (depends_on, calls, owns, connects_to, etc.).

2. **Build valid nodes**
   - Create stable string ids (prefer canonical keys from raw data).
   - Deduplicate by id.
   - Always include required fields:
     - \`position\`: provide numeric coordinates for every node.
     - \`data.label\`: provide a readable string label for every node.
   - You may include additional React Flow fields (for example \`type\`) when useful.

3. **Build valid edges**
   - Ensure every edge has non-empty string \`id\`, \`source\`, \`target\`, and \`type\`.
   - Use deterministic edge ids (for example \`\${source}-\${target}\` or \`\${source}-\${target}-\${relation}\`).
   - Use \`type: 'simplebezier'\` by default unless the user explicitly asks for a different edge type.
   - Use \`markerEnd: 'arrow'\` when edge direction should be explicit.
   - Only emit edges where both endpoint node ids exist.
   - Include \`label\` when relationship meaning or weight should be visible (for example \`"calls"\`, \`"depends_on"\`, or counts).
   - Optionally include \`data\`.

## Node Positioning Guidelines

- Use a clear layered layout based on edge direction:
  - left-to-right flow: increase \`x\` by layer, keep related nodes near each other on \`y\`
  - top-to-bottom flow: increase \`y\` by layer, keep related nodes near each other on \`x\`
- Keep layers visually separated with consistent spacing (for example, 200-300px between layers).
- Keep nodes within the same layer aligned on one axis to make structure easy to scan.
- Order nodes within a layer to reduce edge crossings:
  - place nodes with shared parents/children next to each other
  - avoid alternating unrelated node groups
- Place hub nodes (high degree) near the center of their layer to reduce long diagonal edges.
- Prefer orthogonal progression of coordinates (monotonic x or y across layers) over random placement.
- Ensure positions are deterministic for the same input data so repeated runs produce stable layouts.

4. **Validate before creating attachment**
   - \`nodes\` and \`edges\` are arrays.
   - Every node has non-empty string \`id\`.
   - Every node has \`position.x\` and \`position.y\` as numbers.
   - Every node has \`data.label\` as a non-empty string.
   - Every edge has non-empty string \`id\`, \`source\`, \`target\`, and \`type\`.
   - Remove invalid/partial records instead of emitting broken graph objects.

5. **Create graph attachment**
   - Call ${attachmentTools.add} with:
     - \`type: "${GRAPH_ATTACHMENT_TYPE}"\`
     - \`data: { nodes, edges, title?, description? }\`

6. **Return render instructions to the user**
   - If tool call succeeds, include returned \`attachment_id\` in the response.
   - Render using \`<render_attachment id="ATTACHMENT_ID" />\` so the graph is displayed inline.

## Quality Rules

- Prefer semantic labels over opaque ids where possible.
- Keep graph readable: avoid excessive low-value edges.
- If raw data is too large, summarize:
  - top entities by importance
  - representative relationships
  - explain what was filtered out.

## Failure Handling

- If no valid relationships exist, explain why and ask for alternate relationship keys.
- If the attachment creation fails, report the error and include the corrected payload strategy.

## Graph Attachment Request Examples

## Example: raw relationship rows to graph attachment

Raw rows:

\`\`\`json
[
  { "source_service": "frontend", "target_service": "api", "calls": 1200 },
  { "source_service": "api", "target_service": "auth", "calls": 900 },
  { "source_service": "api", "target_service": "orders", "calls": 700 }
]
\`\`\`

Attachment add payload:

\`\`\`json
{
  "type": "graph",
  "description": "Service dependency graph",
  "data": {
    "title": "Service Dependencies",
    "description": "Derived from service call counts",
    "nodes": [
      { "id": "frontend", "position": { "x": 0, "y": 0 }, "data": { "label": "frontend" } },
      { "id": "api", "position": { "x": 240, "y": 0 }, "data": { "label": "api" } },
      { "id": "auth", "position": { "x": 480, "y": 0 }, "data": { "label": "auth" } },
      { "id": "orders", "position": { "x": 480, "y": 180 }, "data": { "label": "orders" } }
    ],
    "edges": [
      { "id": "frontend-api", "source": "frontend", "target": "api", "type": "simplebezier", "markerEnd": "arrow", "label": "1200" },
      { "id": "api-auth", "source": "api", "target": "auth", "type": "simplebezier", "markerEnd": "arrow", "label": "900" },
      { "id": "api-orders", "source": "api", "target": "orders", "type": "simplebezier", "markerEnd": "arrow", "label": "700" }
    ]
  }
}
\`\`\`

## Example response pattern after success

- Created graph attachment \`att-graph-123\`.
- Rendering graph inline:

\`\`\`xml
<render_attachment id="att-graph-123" />
\`\`\`

## Example: Mermaid graph to graph attachment

Mermaid input:

\`\`\`text
graph LR
  Frontend[Frontend] --> API[API Service]
  API --> Auth[Auth Service]
  API --> Orders[Orders Service]
\`\`\`

Converted attachment payload:

\`\`\`json
{
  "type": "graph",
  "description": "Converted from Mermaid graph",
  "data": {
    "title": "Service Dependencies (Mermaid)",
    "nodes": [
      { "id": "Frontend", "position": { "x": 0, "y": 0 }, "data": { "label": "Frontend" } },
      { "id": "API", "position": { "x": 240, "y": 0 }, "data": { "label": "API Service" } },
      { "id": "Auth", "position": { "x": 480, "y": -80 }, "data": { "label": "Auth Service" } },
      { "id": "Orders", "position": { "x": 480, "y": 80 }, "data": { "label": "Orders Service" } }
    ],
    "edges": [
      { "id": "Frontend-API", "source": "Frontend", "target": "API", "type": "simplebezier", "markerEnd": "arrow", "label": "calls" },
      { "id": "API-Auth", "source": "API", "target": "Auth", "type": "simplebezier", "markerEnd": "arrow", "label": "calls" },
      { "id": "API-Orders", "source": "API", "target": "Orders", "type": "simplebezier", "markerEnd": "arrow", "label": "calls" }
    ]
  }
}
\`\`\`

Mermaid conversion notes:
- Use Mermaid node IDs as attachment node \`id\` values (for example \`API\`).
- Use Mermaid bracket text as \`data.label\` (for example \`API Service\`).
- Preserve edge direction from Mermaid arrows.
- If Mermaid omits positions, generate deterministic coordinates for all nodes.
- Apply layered placement so dependency depth is visually separated and edge intersections are minimized.
`,
});
