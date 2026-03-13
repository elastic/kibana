/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attachmentTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const mermaidGraphCreationSkill = defineSkillType({
  id: 'create-mermaid-graph',
  name: 'create-mermaid-graph',
  basePath: 'skills/platform/mermaid',
  description:
    'Create mermaid diagrams to visually represent architecture, workflows, state machines, entity relationships, sequences, and decision trees. Produces inline-rendered SVG diagrams in the conversation.',
  content: `## When to Use This Skill

Use this skill when:
- The user asks for an **architecture diagram**, system overview, or component map.
- The user asks for a **workflow or process flow** (e.g., data pipeline, CI/CD, request lifecycle).
- The user needs a **state machine** or state transition diagram.
- The user asks for an **entity-relationship diagram** (ERD) showing data model relationships.
- The user asks for a **sequence diagram** showing interactions between services or components.
- The user needs a **decision tree** or branching logic visualization.
- The user asks for a **dependency graph** (package dependencies, service dependencies).
- The user asks for a **timeline**, **Gantt chart**, or project schedule visualization.
- The user explicitly asks for a "mermaid diagram", "flowchart", or "graph".

Do **not** use this skill when:
- The user needs **numeric data visualizations** (line charts, bar charts, pie charts with real data) — use the visualization attachment type instead.
- The user only needs a **simple text list** or bullet points — plain markdown is sufficient.
- The user needs a **data table** — use ES|QL results or a text attachment.
- The user asks to **query or explore data** — use data exploration tools first.

## How to Create a Mermaid Attachment

1. **Compose the mermaid definition** using the syntax reference below.

2. **Create the attachment** by calling the \`${attachmentTools.add}\` tool:
   \`\`\`json
   {
     "type": "mermaid",
     "data": {
       "content": "graph TD\\n  A[Start] --> B{Decision}\\n  B -->|Yes| C[Action]\\n  B -->|No| D[End]",
       "title": "Simple Decision Flow"
     }
   }
   \`\`\`

3. **Render the diagram inline** by including the attachment ID in your response:
   \`<render_attachment id="<attachment_id>" />\`

   The diagram will be rendered as an interactive SVG directly in the conversation.

## Mermaid Syntax Quick Reference

### Flowchart / Graph
Use \`graph TD\` (top-down) or \`graph LR\` (left-right):
\`\`\`
graph TD
  A[Rectangle] --> B(Rounded)
  B --> C{Diamond}
  C -->|Option 1| D[Result 1]
  C -->|Option 2| E[Result 2]
\`\`\`

### Sequence Diagram
\`\`\`
sequenceDiagram
  participant Client
  participant Server
  participant Database
  Client->>Server: HTTP Request
  Server->>Database: Query
  Database-->>Server: Results
  Server-->>Client: Response
\`\`\`

### State Diagram
\`\`\`
stateDiagram-v2
  [*] --> Idle
  Idle --> Processing: start
  Processing --> Complete: success
  Processing --> Error: failure
  Error --> Idle: retry
  Complete --> [*]
\`\`\`

### Entity-Relationship Diagram
\`\`\`
erDiagram
  USER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  PRODUCT ||--o{ LINE_ITEM : "is in"
\`\`\`

### Class Diagram
\`\`\`
classDiagram
  class Animal {
    +String name
    +int age
    +makeSound()
  }
  class Dog {
    +fetch()
  }
  Animal <|-- Dog
\`\`\`

### Gantt Chart
\`\`\`
gantt
  title Project Timeline
  dateFormat YYYY-MM-DD
  section Phase 1
  Design     :a1, 2024-01-01, 14d
  Implement  :a2, after a1, 21d
  section Phase 2
  Testing    :a3, after a2, 14d
\`\`\`

## Best Practices

- **Use descriptive node labels**: Prefer \`A[Ingest Pipeline]\` over \`A[IP]\`. Labels should be self-explanatory.
- **Limit diagram complexity**: Keep diagrams under 15-20 nodes. For larger systems, split into multiple focused diagrams (e.g., one per subsystem or layer).
- **Use subgraphs for grouping**: Group related nodes into \`subgraph\` blocks for clarity:
  \`\`\`
  subgraph Backend
    API --> Service --> DB
  end
  \`\`\`
- **Choose consistent direction**:
  - \`TD\` (top-down) for hierarchies and org charts
  - \`LR\` (left-right) for sequences, data flows, and pipelines
- **Use styling sparingly**: Mermaid supports classes and styles, but keep diagrams clean. Focus on structure over decoration.
- **Prefer multiple diagrams over one giant one**: If the user asks about a complex system, create 2-3 focused diagrams rather than cramming everything into one.
`,
  referencedContent: [
    {
      relativePath: './examples',
      name: 'create-mermaid-attachment-requests',
      content: `# Mermaid Attachment Creation Examples

## Simple flowchart

\`\`\`json
{
  "type": "mermaid",
  "data": {
    "content": "graph LR\\n  A[User Request] --> B[Load Balancer]\\n  B --> C[Web Server]\\n  C --> D[App Server]\\n  D --> E[(Database)]",
    "title": "Request Flow"
  }
}
\`\`\`

## Sequence diagram

\`\`\`json
{
  "type": "mermaid",
  "data": {
    "content": "sequenceDiagram\\n  participant U as User\\n  participant K as Kibana\\n  participant ES as Elasticsearch\\n  U->>K: Search Request\\n  K->>ES: Query DSL\\n  ES-->>K: Results\\n  K-->>U: Rendered Response",
    "title": "Kibana Search Flow"
  }
}
\`\`\`

## Architecture overview with subgraphs

\`\`\`json
{
  "type": "mermaid",
  "data": {
    "content": "graph TD\\n  subgraph Ingestion\\n    Beat[Filebeat] --> LS[Logstash]\\n    Agent[Elastic Agent] --> LS\\n  end\\n  subgraph Storage\\n    LS --> ES[(Elasticsearch)]\\n  end\\n  subgraph Visualization\\n    ES --> Kibana[Kibana]\\n    Kibana --> Dashboard[Dashboards]\\n    Kibana --> Discover[Discover]\\n  end",
    "title": "Elastic Stack Architecture"
  }
}
\`\`\`
`,
    },
  ],
  getRegistryTools: () => [],
});
