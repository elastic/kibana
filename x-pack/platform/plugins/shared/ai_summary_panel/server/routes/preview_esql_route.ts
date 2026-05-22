/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import dateMath from '@kbn/datemath';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';

function injectTimeFilter(query: string, timeField: string): string {
  const clause = `| WHERE \`${timeField}\` >= ?_tstart AND \`${timeField}\` < ?_tend `;
  const pipeIdx = query.indexOf('|');
  return pipeIdx === -1
    ? `${query.trimEnd()} ${clause}`
    : `${query.slice(0, pipeIdx)}${clause}${query.slice(pipeIdx)}`;
}

const TIMESTAMP_CANDIDATES = ['@timestamp', 'timestamp', 'time', 'date', 'event.created'];
const DATE_KEYWORDS = ['date', 'time', 'created', 'updated', 'modified', 'timestamp'];

function pickDateFieldHeuristic(fields: string[]): string {
  const nonNested = fields.filter((f) => !f.includes('.'));
  const pool = nonNested.length > 0 ? nonNested : fields;
  for (const kw of DATE_KEYWORDS) {
    const match = pool.find((f) => f.toLowerCase().includes(kw));
    if (match) return match;
  }
  return pool.slice().sort()[0];
}

function detectTimeFieldFromQuery(esqlQuery: string): string | null {
  const sortMatch = esqlQuery.match(/\|\s*SORT\s+`?([\w.@]+)`?/i);
  const sortField = sortMatch?.[1]?.trim();
  if (!sortField) return null;
  if (TIMESTAMP_CANDIDATES.includes(sortField)) return sortField;
  for (const kw of DATE_KEYWORDS) {
    if (sortField.toLowerCase().includes(kw)) return sortField;
  }
  return null;
}

export function registerPreviewEsqlRoute(router: IRouter) {
  router.post(
    {
      path: '/internal/ai_summary_panel/preview_esql',
      security: {
        authz: { enabled: false, reason: 'Scoped to current user via esClient' },
      },
      options: { access: 'internal' },
      validate: {
        body: schema.object({
          esqlQuery: schema.string(),
          timeRange: schema.maybe(
            schema.object({ from: schema.string(), to: schema.string() })
          ),
        }),
      },
    },
    async (context, request, response) => {
      const { esqlQuery, timeRange } = request.body;
      const esClient = (await context.core).elasticsearch.client;

      const esqlParams = timeRange
        ? [
            { _tstart: dateMath.parse(timeRange.from)?.toISOString() ?? timeRange.from },
            { _tend: dateMath.parse(timeRange.to, { roundUp: true })?.toISOString() ?? timeRange.to },
          ]
        : undefined;

      let detectedTimeField: string | null = null;
      const queryAlreadyHasTimeParams =
        esqlQuery.includes('?_tstart') || esqlQuery.includes('?_tend');
      if (timeRange && !queryAlreadyHasTimeParams) {
        detectedTimeField = detectTimeFieldFromQuery(esqlQuery);
        if (!detectedTimeField) {
          const indexPattern = getIndexPatternFromESQLQuery(esqlQuery) || null;
          if (indexPattern) {
            try {
              const candidateCaps = await esClient.asCurrentUser.fieldCaps({
                index: indexPattern,
                fields: TIMESTAMP_CANDIDATES,
              });
              for (const field of TIMESTAMP_CANDIDATES) {
                if (candidateCaps.fields[field] && 'date' in candidateCaps.fields[field]) {
                  detectedTimeField = field;
                  break;
                }
              }
              if (!detectedTimeField) {
                const allCaps = await esClient.asCurrentUser.fieldCaps({
                  index: indexPattern,
                  fields: ['*'],
                });
                const dateFields = Object.entries(allCaps.fields)
                  .filter(([, types]) => 'date' in types)
                  .map(([name]) => name);
                if (dateFields.length > 0) detectedTimeField = pickDateFieldHeuristic(dateFields);
              }
            } catch { /* non-fatal — skip time injection */ }
          }
        }
      }

      const effectiveQuery = detectedTimeField
        ? injectTimeFilter(esqlQuery, detectedTimeField)
        : esqlQuery;

      try {
        const result = await esClient.asCurrentUser.esql.query({
          query: effectiveQuery,
          ...(esqlParams ? { params: esqlParams } : {}),
        });
        return response.ok({
          body: {
            columns: result.columns as Array<{ name: string; type: string }>,
            rows: (result.values as unknown[][]).slice(0, 10),
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return response.badRequest({ body: msg });
      }
    }
  );
}
