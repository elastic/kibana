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
- A user asks for an architecture diagram (e.g. services inside a K8s cluster, components in a VPC).

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
      - \`data\`: object with required string \`label\` and optional string \`icon\`
    - optional fields:
      - \`type\`: set to \`"group"\` for container/grouping nodes
      - \`parentId\`: id of a group node this node belongs to (positions become relative to the parent)
      - \`style\`: object with optional \`width\` and \`height\` numbers (use for group nodes to set bounding area)
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
   - Identify natural groupings (services in a namespace, components in a cluster, stages in a pipeline).

2. **Build valid nodes**
   - Create stable string ids (prefer canonical keys from raw data).
   - Deduplicate by id.
   - Always include required fields:
     - \`position\`: provide numeric coordinates for every node.
     - \`data.label\`: provide a readable string label for every node.
   - Always include \`data.icon\` with an EUI icon name that matches the entity type (see Icon Reference below).
   - You may include additional React Flow fields when useful.

3. **Build valid edges**
   - Ensure every edge has non-empty string \`id\`, \`source\`, \`target\`, and \`type\`.
   - Use deterministic edge ids (for example \`\${source}-\${target}\` or \`\${source}-\${target}-\${relation}\`).
   - Use \`type: 'step'\` by default. This produces clean right-angle connectors. Only use \`'simplebezier'\` or \`'straight'\` if the user explicitly requests curved or straight edges.
   - Use \`markerEnd: 'arrow'\` when edge direction should be explicit.
   - Only emit edges where both endpoint node ids exist.
   - Include \`label\` when relationship meaning or weight should be visible (for example \`"calls"\`, \`"depends_on"\`, or counts).
   - Optionally include \`data\`.

## Icon Reference

Always set \`data.icon\` on every node. Pick the best match from this curated list:

| Entity type | Icon name |
|---|---|
| Generic service / microservice | \`compute\` |
| Web frontend / UI | \`globe\` |
| API / gateway | \`endpoint\` |
| Database / data store | \`database\` |
| Message queue / broker | \`logstashQueue\` |
| Cache (Redis, Memcached) | \`bolt\` |
| Authentication / security | \`lock\` |
| User / identity | \`user\` |
| Host / server / VM | \`compute\` |
| Container | \`container\` |
| Kubernetes / orchestration | \`kubernetesNode\` |
| Cloud provider / region | \`cloudSunny\` |
| Network / load balancer | \`network\` |
| Storage / disk / S3 | \`storage\` |
| Monitoring / observability | \`eye\` |
| Logging | \`document\` |
| Email / notification | \`email\` |
| Search / Elasticsearch | \`search\` |
| Package / module / library | \`package\` |
| Pipeline / workflow | \`pipelineApp\` |
| Alert / warning | \`warning\` |
| Error / failure | \`error\` |
| Success / healthy | \`checkInCircleFilled\` |
| Unknown / generic | \`node\` |

If none of the above match, use \`node\` as a safe fallback.

## Group Nodes (Architecture Views)

When the data has a natural containment hierarchy (e.g. services inside a Kubernetes namespace, components inside a VPC, stages in a deployment pipeline), use group nodes to visually enclose related nodes:

1. Create a parent node with \`type: "group"\` and a \`style\` with explicit \`width\` and \`height\` to define the bounding area.
2. Set \`parentId\` on child nodes to the group node's id.
3. Child node positions become **relative to the parent's origin** (top-left corner of the group).
4. Leave enough padding inside the group (at least 40px on each side) so children are not clipped.
5. Group nodes should have \`data.label\` set to the group name and an appropriate \`data.icon\`.

Example group node:
\`\`\`json
{ "id": "k8s-cluster", "type": "group", "position": { "x": 0, "y": 0 }, "style": { "width": 560, "height": 300 }, "data": { "label": "K8s Cluster", "icon": "kubernetesNode" } }
\`\`\`

Example child node inside the group:
\`\`\`json
{ "id": "api-svc", "parentId": "k8s-cluster", "position": { "x": 40, "y": 60 }, "data": { "label": "API Service", "icon": "endpoint" } }
\`\`\`

## Node Positioning Guidelines

- Use a clear layered layout based on edge direction:
  - left-to-right flow: increase \`x\` by layer, keep related nodes near each other on \`y\`
  - top-to-bottom flow: increase \`y\` by layer, keep related nodes near each other on \`x\`
- Keep layers visually separated with consistent spacing (200-300px between layers).
- Keep nodes within the same layer aligned on one axis to make structure easy to scan.
- Order nodes within a layer to reduce edge crossings:
  - place nodes with shared parents/children next to each other
  - avoid alternating unrelated node groups
- Place hub nodes (high degree) near the center of their layer to reduce long diagonal edges.
- Prefer orthogonal progression of coordinates (monotonic x or y across layers) over random placement.
- Ensure positions are deterministic for the same input data so repeated runs produce stable layouts.
- For peer services at the same level, use a grid layout rather than forcing a tree structure.

4. **Validate before creating attachment**
   - \`nodes\` and \`edges\` are arrays.
   - Every node has non-empty string \`id\`.
   - Every node has \`position.x\` and \`position.y\` as numbers.
   - Every node has \`data.label\` as a non-empty string.
   - Every node has \`data.icon\` as a non-empty string.
   - Every edge has non-empty string \`id\`, \`source\`, \`target\`, and \`type\`.
   - Group nodes have \`type: "group"\` and \`style.width\`/\`style.height\`.
   - Child nodes with \`parentId\` reference an existing group node.
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
- Always include an icon on every node for visual clarity.
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
      { "id": "frontend", "position": { "x": 0, "y": 0 }, "data": { "label": "Frontend", "icon": "globe" } },
      { "id": "api", "position": { "x": 280, "y": 0 }, "data": { "label": "API", "icon": "endpoint" } },
      { "id": "auth", "position": { "x": 560, "y": -90 }, "data": { "label": "Auth", "icon": "lock" } },
      { "id": "orders", "position": { "x": 560, "y": 90 }, "data": { "label": "Orders", "icon": "package" } }
    ],
    "edges": [
      { "id": "frontend-api", "source": "frontend", "target": "api", "type": "step", "markerEnd": "arrow", "label": "1,200 calls" },
      { "id": "api-auth", "source": "api", "target": "auth", "type": "step", "markerEnd": "arrow", "label": "900 calls" },
      { "id": "api-orders", "source": "api", "target": "orders", "type": "step", "markerEnd": "arrow", "label": "700 calls" }
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

## Example: Architecture diagram with group nodes

\`\`\`json
{
  "type": "graph",
  "description": "K8s cluster architecture",
  "data": {
    "title": "Production Architecture",
    "nodes": [
      { "id": "k8s", "type": "group", "position": { "x": 100, "y": 0 }, "style": { "width": 560, "height": 260 }, "data": { "label": "K8s Cluster", "icon": "kubernetesNode" } },
      { "id": "api", "parentId": "k8s", "position": { "x": 40, "y": 60 }, "data": { "label": "API Service", "icon": "endpoint" } },
      { "id": "worker", "parentId": "k8s", "position": { "x": 300, "y": 60 }, "data": { "label": "Worker", "icon": "compute" } },
      { "id": "cache", "parentId": "k8s", "position": { "x": 40, "y": 170 }, "data": { "label": "Redis Cache", "icon": "bolt" } },
      { "id": "lb", "position": { "x": 0, "y": 60 }, "data": { "label": "Load Balancer", "icon": "network" } },
      { "id": "db", "position": { "x": 760, "y": 60 }, "data": { "label": "PostgreSQL", "icon": "database" } }
    ],
    "edges": [
      { "id": "lb-api", "source": "lb", "target": "api", "type": "step", "markerEnd": "arrow" },
      { "id": "api-worker", "source": "api", "target": "worker", "type": "step", "markerEnd": "arrow", "label": "enqueue" },
      { "id": "api-cache", "source": "api", "target": "cache", "type": "step", "markerEnd": "arrow" },
      { "id": "worker-db", "source": "worker", "target": "db", "type": "step", "markerEnd": "arrow", "label": "write" }
    ]
  }
}
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
      { "id": "Frontend", "position": { "x": 0, "y": 0 }, "data": { "label": "Frontend", "icon": "globe" } },
      { "id": "API", "position": { "x": 280, "y": 0 }, "data": { "label": "API Service", "icon": "endpoint" } },
      { "id": "Auth", "position": { "x": 560, "y": -90 }, "data": { "label": "Auth Service", "icon": "lock" } },
      { "id": "Orders", "position": { "x": 560, "y": 90 }, "data": { "label": "Orders Service", "icon": "package" } }
    ],
    "edges": [
      { "id": "Frontend-API", "source": "Frontend", "target": "API", "type": "step", "markerEnd": "arrow" },
      { "id": "API-Auth", "source": "API", "target": "Auth", "type": "step", "markerEnd": "arrow" },
      { "id": "API-Orders", "source": "API", "target": "Orders", "type": "step", "markerEnd": "arrow" }
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
- Always assign an appropriate \`data.icon\` based on the entity type.
`,
});
