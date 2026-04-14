/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type { A2UISurfaceAttachmentData } from '@kbn/agent-builder-common/attachments';
import {
  AttachmentType,
  a2uiSurfaceAttachmentDataSchema,
} from '@kbn/agent-builder-common/attachments';
import { A2UIComponentType, KIBANA_EUI_CATALOG_ID } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

const formatComponentSummary = (data: A2UISurfaceAttachmentData): string => {
  const componentCounts = new Map<string, number>();
  for (const comp of data.components) {
    componentCounts.set(comp.component, (componentCounts.get(comp.component) ?? 0) + 1);
  }
  const counts = Array.from(componentCounts.entries())
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ');

  return [
    `A2UI Surface: ${data.title ?? data.surface_id}`,
    `Catalog: ${data.catalog_id}`,
    `Components (${data.components.length}): ${counts}`,
    data.data_model ? `Data model keys: ${Object.keys(data.data_model).join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');
};

const AGENT_DESCRIPTION = `An A2UI surface attachment defines a declarative UI layout rendered inline in the conversation.
The agent creates surfaces by calling the ${platformCoreTools.createA2UISurface} tool.

The data field must contain:
- surface_id: unique string identifier for the surface
- catalog_id: "${KIBANA_EUI_CATALOG_ID}"
- components: flat array of component objects (adjacency list). Exactly one must have id "root".
- data_model: (optional) object whose values are referenced by data-bound component properties via JSON Pointer paths
- title: (optional) display title for the surface

Each component object has:
- id: unique string within the surface
- component: one of the supported types listed below
- Additional props depending on component type

Supported component types and their EUI rendering:
- ${A2UIComponentType.Text}: Displays text. Props: text (string or {path}), variant ("title"|"body"|"caption")
- ${A2UIComponentType.Row}: Horizontal flex layout. Props: children (array of component ids), align, justify
- ${A2UIComponentType.Column}: Vertical flex layout. Props: children (array of component ids), align, justify
- ${A2UIComponentType.Card}: Panel container. Props: child (single component id), title (optional)
- ${A2UIComponentType.Stat}: Metric display. Props: title (label), value (the number/string), description (optional)
- ${A2UIComponentType.Table}: Data table. Props: columns [{field, name}], data_path (JSON Pointer to array in data_model)
- ${A2UIComponentType.DescriptionList}: Key-value pairs. Props: items [{title, description}]
- ${A2UIComponentType.Button}: Clickable button. Props: text, action {event: {name, context}}, variant ("primary"|"default")
- ${A2UIComponentType.Divider}: Horizontal rule. Props: size ("s"|"m"|"l")
- ${A2UIComponentType.Icon}: Icon display. Props: name (EUI icon name), color, size
- ${A2UIComponentType.Badge}: Label badge. Props: text, color
- ${A2UIComponentType.VisualizationRef}: Embeds an existing visualization attachment. Props: attachment_id, version (optional)
- ${A2UIComponentType.FieldValue}: Field name/value pair. Props: field_name, field_value

Data binding: any string property can be replaced with {path: "/pointer"} to bind to the data_model using JSON Pointer (RFC 6901).

Example surface (stat card with description):
{
  "surface_id": "host_summary",
  "catalog_id": "${KIBANA_EUI_CATALOG_ID}",
  "title": "Host Summary",
  "components": [
    {"id": "root", "component": "Column", "children": ["stats_row", "details"]},
    {"id": "stats_row", "component": "Row", "children": ["cpu_stat", "mem_stat"]},
    {"id": "cpu_stat", "component": "Stat", "title": "CPU Usage", "value": {"path": "/cpu_percent"}, "description": "Average over last hour"},
    {"id": "mem_stat", "component": "Stat", "title": "Memory", "value": {"path": "/memory_percent"}, "description": "Current usage"},
    {"id": "details", "component": "DescriptionList", "items": [
      {"title": "Hostname", "description": {"path": "/hostname"}},
      {"title": "OS", "description": {"path": "/os"}}
    ]}
  ],
  "data_model": {
    "cpu_percent": "72%",
    "memory_percent": "4.2 GB / 8 GB",
    "hostname": "web-server-01",
    "os": "Ubuntu 22.04"
  }
}

After rendering, use <render_attachment id="ATTACHMENT_ID"> in the response to display the surface inline.`;

/**
 * Creates the definition for the `a2ui_surface` attachment type.
 *
 * A2UI surfaces are declarative UI layouts composed from a flat adjacency list
 * of components that map to EUI primitives. The agent generates the component
 * spec, and the client-side renderer translates it to live EUI components.
 */
export const createA2UISurfaceAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.a2uiSurface,
  A2UISurfaceAttachmentData
> => {
  return {
    id: AttachmentType.a2uiSurface,

    validate: (input) => {
      const parseResult = a2uiSurfaceAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },

    format: (attachment) => ({
      getRepresentation: () => ({
        type: 'text',
        value: formatComponentSummary(attachment.data),
      }),
    }),

    getAgentDescription: () => AGENT_DESCRIPTION,

    isReadonly: false,

    getTools: () => [platformCoreTools.createA2UISurface],
  };
};
