/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface CatalogComponentSchema {
  description?: string;
  properties?: Record<string, { const?: string; description?: string; enum?: string[] }>;
  required?: readonly string[];
}

interface CatalogSchema {
  catalogId: string;
  instructions?: string[];
  components: Record<string, CatalogComponentSchema>;
  functions?: Record<string, { description?: string }>;
}

/**
 * Renders the catalog as compact prose for an LLM prompt.
 *
 * Handing over the raw JSON Schema would cost several thousand tokens on every
 * turn, most of it structural noise. Deriving this from the same catalog.json
 * the renderer uses means the agent's instructions cannot drift from what the
 * renderer will actually accept.
 */
export function describeCatalog(schema: CatalogSchema): string {
  const lines: string[] = [];

  lines.push(`Catalog: ${schema.catalogId}`);
  if (schema.instructions?.length) {
    lines.push('', 'Rules:');
    schema.instructions.forEach((rule) => lines.push(`- ${rule}`));
  }

  lines.push('', 'Components:');
  for (const [name, component] of Object.entries(schema.components)) {
    const required = (component.required ?? []).filter((prop) => prop !== 'component');
    const props = Object.entries(component.properties ?? {})
      .filter(([prop]) => prop !== 'component')
      .map(([prop, spec]) => {
        const flag = required.includes(prop) ? '*' : '';
        const values = spec.enum ? ` (${spec.enum.join('|')})` : '';
        return `${prop}${flag}${values}`;
      });
    const summary = component.description ? ` — ${component.description}` : '';
    lines.push(`- ${name}: ${props.join(', ') || 'no props'}${summary}`);
  }

  if (schema.functions && Object.keys(schema.functions).length > 0) {
    lines.push('', 'Functions (usable as {"call": name, "args": {...}}):');
    for (const [name, fn] of Object.entries(schema.functions)) {
      lines.push(`- ${name}${fn.description ? ` — ${fn.description}` : ''}`);
    }
  }

  lines.push('', '* marks a required property.');
  return lines.join('\n');
}
