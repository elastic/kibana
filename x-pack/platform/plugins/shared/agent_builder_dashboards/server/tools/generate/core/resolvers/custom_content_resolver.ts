/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/inference-common';
import type { ModelProvider } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { appendLimitToQuery } from '@kbn/esql-utils';
import {
  CUSTOM_CONTENT_SCRIPT_PATTERN,
  CUSTOM_CONTENT_MAX_TEMPLATE_BYTES,
  CUSTOM_CONTENT_CSS_VARS_GUIDANCE,
  CUSTOM_CONTENT_SANDBOX_GUIDANCE,
  CUSTOM_CONTENT_LIQUID_DATA_MODEL_GUIDANCE,
  stripMarkdownFences,
} from '@kbn/custom-content-common';
import { sanitizeCellValue } from './sanitize_cell_value';

const SAMPLE_ROW_COUNT = 3;

function formatSampleTable(columns: Array<{ name: string }>, rows: unknown[][]): string {
  const header = columns.map((c) => sanitizeCellValue(c.name)).join(' | ');
  const separator = columns.map(() => '---').join(' | ');
  const dataRows = rows.map((row) => row.map(sanitizeCellValue).join(' | ')).join('\n');
  return `${header}\n${separator}\n${dataRows}`;
}

function colorSection(): string {
  return `VISUAL DESIGN — ${CUSTOM_CONTENT_CSS_VARS_GUIDANCE}
- Clean, modern design. Comfortable padding. Do NOT add a border around cards, containers, or the panel by default — separate elements using background-color contrast and spacing only. Only add a border (e.g. var(--cc-color-border)) if the user explicitly asks for one.`;
}

function buildSystemPromptStatic(): string {
  return `You are a custom content assistant embedded in a Kibana dashboard panel.

Your job is to generate a single self-contained HTML document that presents the user's data or answers their prompt in the most appropriate form.

OUTPUT RULES — follow these exactly:
- Output ONLY valid HTML. No markdown fences, no explanation, no commentary before or after.
- The HTML must be fully self-contained: all CSS inline in <style> tags.
${CUSTOM_CONTENT_SANDBOX_GUIDANCE}

${colorSection()}

CONTENT RULES:
- Pick the presentation format that best fits the data and the prompt. Prefer tables, lists, KPI cards, and status boards over charts.
- Fill the full panel width. Height should fit the content naturally.
- Do not add a title — the dashboard panel has its own title.
- For status indicators: use colored badges/pills with CSS background-color.`;
}

function buildSystemPromptTemplate(): string {
  return `You are a data visualization assistant embedded in a Kibana dashboard panel.

Generate a reusable HTML template using Liquid template syntax. The template is filled with real ES|QL query results at render time — do NOT embed literal data values.

${CUSTOM_CONTENT_LIQUID_DATA_MODEL_GUIDANCE}

OUTPUT RULES:
- Output ONLY the HTML template. No markdown fences, no explanation.
- All CSS inline in <style> tags.
${CUSTOM_CONTENT_SANDBOX_GUIDANCE}
- Aggregation/grouping/sorting cannot happen in the template — it only receives \`rows\` and \`max\` as given. If the data needs grouping that isn't already reflected in \`rows\`, that has to happen upstream in the ES|QL query (STATS ... BY ...).
- For charts use pure CSS or inline SVG.

${colorSection()}

CONTENT RULES:
- Pick the best visualization for the schema and prompt. Full panel width; height fits content naturally. No title.
- Status board example:
  {% for row in rows %}
  <div class="card {% if row["revenue"].value >= 10000 %}card-green{% elsif row["revenue"].value >= 5000 %}card-yellow{% else %}card-red{% endif %}">
    <span>{{ row["category"].value }}</span><span>{{ row["revenue"].value }}</span>
  </div>
  {% endfor %}`;
}

export interface CustomContentTemplateResolverDeps {
  modelProvider: ModelProvider;
  esClient: IScopedClusterClient;
  logger: Logger;
}

export const createCustomContentTemplateResolver = ({
  modelProvider,
  esClient,
  logger,
}: CustomContentTemplateResolverDeps) => {
  return async ({
    prompt,
    esqlQuery,
    existingTemplate,
  }: {
    prompt: string;
    esqlQuery?: string;
    existingTemplate?: string;
  }): Promise<string> => {
    let columns: Array<{ name: string; type: string }> = [];
    let values: unknown[][] = [];

    if (esqlQuery) {
      try {
        const sampledQuery = appendLimitToQuery(esqlQuery, SAMPLE_ROW_COUNT);
        const result = await esClient.asCurrentUser.esql.query({ query: sampledQuery });
        columns = (result.columns ?? []) as Array<{ name: string; type: string }>;
        values = (result.values ?? []) as unknown[][];
      } catch (err) {
        logger.debug(`custom_content template resolver: ES|QL sample fetch failed — ${err}`);
      }
    }

    const systemPrompt = esqlQuery ? buildSystemPromptTemplate() : buildSystemPromptStatic();

    let userContent: string;
    if (esqlQuery) {
      const promptPrefix = prompt ? `${prompt}\n\n` : '';
      let schemaSection: string;
      if (columns.length > 0) {
        const schemaLines = columns.map((c) => `  - ${c.name} (${c.type})`).join('\n');
        const sampleSection =
          values.length > 0
            ? `\n\nSample rows:\n${formatSampleTable(columns, values)}`
            : '\n\nNote: no rows available for the current time range.';
        schemaSection = `Data schema:\n${schemaLines}${sampleSection}\n\nGenerate an HTML template that accesses each column via bracket notation using its exact name, e.g. row["${columns[0].name}"].value.`;
      } else {
        schemaSection =
          'Note: schema unavailable. Generate a suitable template for this ES|QL query.';
      }

      if (existingTemplate) {
        userContent = `${promptPrefix}Current template:\n${existingTemplate}\n\n${schemaSection}\n\nUpdate the template above to reflect the changes. Preserve the overall layout, design, and color choices — only change what is necessary.`;
      } else {
        userContent = `${promptPrefix}${schemaSection}`;
      }
    } else if (existingTemplate) {
      userContent = `Current template:\n${existingTemplate}\n\nUpdate instructions: ${prompt}\n\nPreserve the overall layout, design, and color choices — only change what is necessary.`;
    } else {
      userContent = prompt;
    }

    const { inferenceClient } = await modelProvider.getDefaultModel();
    const response = await inferenceClient.chatComplete({
      system: systemPrompt,
      messages: [{ role: MessageRole.User, content: userContent }],
      stream: false,
    });

    const template = stripMarkdownFences(response.content);

    if (CUSTOM_CONTENT_SCRIPT_PATTERN.test(template)) {
      throw new Error('Generated template was rejected: contains a <script> tag.');
    }
    if (Buffer.byteLength(template, 'utf8') > CUSTOM_CONTENT_MAX_TEMPLATE_BYTES) {
      throw new Error(
        `Generated template was rejected: exceeds the ${CUSTOM_CONTENT_MAX_TEMPLATE_BYTES}-byte limit.`
      );
    }

    return template;
  };
};
