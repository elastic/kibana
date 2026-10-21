/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Lowers a Lens XY panel's annotation layers to the `xyChart` `annotations` field: manual events and ranges as
// authored, and query annotations as one event per matching document over the panel's window.

import type { ExecuteEsql } from './esql_response';
import type { ChartNode } from './bind_charts';
import type { TimeRange } from './dashboard';

type Json = Record<string, unknown>;

interface LensAnnotation {
  id: string;
  type?: 'manual' | 'query';
  label?: string;
  color?: string;
  icon?: string;
  lineStyle?: string;
  lineWidth?: number;
  textVisibility?: boolean;
  isHidden?: boolean;
  key?: { type?: 'point_in_time' | 'range'; timestamp?: string; endTimestamp?: string };
  timeField?: string;
  extraFields?: string[];
  filter?: { query?: string; language?: 'kuery' | 'lucene' };
}

export interface Annotation {
  key: string;
  label: string;
  at: string;
  until?: string;
}

/** ES|QL keeps at most 10,000 rows; a layer that reaches it is refused rather than cut. */
const ESQL_ROW_LIMIT = 10_000;

const quote = (text: string) => `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const field = (name: string) => `\`${name.replace(/`/g, '``')}\``;

const searchOf = ({ query = '', language }: NonNullable<LensAnnotation['filter']>) =>
  query.trim() === ''
    ? undefined
    : language === 'lucene'
    ? `QSTR(${quote(query)})`
    : `KQL(${quote(query)})`;

/** The index the panel's own query reads, which the sample annotation layers share. */
const indexOf = (esql: string) => /^\s*FROM\s+([^\s|]+)/i.exec(esql)?.[1];

export const bindAnnotations = async (
  lens: Json | undefined,
  node: ChartNode,
  {
    window,
    esql,
    executeEsql,
  }: { window: TimeRange | undefined; esql: string; executeEsql: ExecuteEsql }
): Promise<{ annotations: Annotation[]; hints: Json; refusals: string[] }> => {
  const visualization =
    ((lens?.state as Json | undefined)?.visualization as Json | undefined) ?? {};
  const layers = ((visualization.layers as Json[] | undefined) ?? []).filter(
    ({ layerType }) => layerType === 'annotations'
  );
  const lensAnnotations = layers
    .flatMap(({ annotations }) => (annotations as LensAnnotation[] | undefined) ?? [])
    .filter(({ isHidden }) => !isHidden);
  const annotations: Annotation[] = [];
  const styles: Json = {};
  const refusals: string[] = [];
  if (lensAnnotations.length === 0) {
    return { annotations, hints: {}, refusals };
  }
  if ((node.x as Json | undefined)?.type !== 'time') {
    return { annotations, hints: {}, refusals: ['annotations on a chart without a time x'] };
  }

  for (const annotation of lensAnnotations) {
    const label = annotation.label ?? 'Event';
    styles[annotation.id] = {
      ...(annotation.color ? { color: annotation.color } : {}),
      ...(annotation.icon ? { icon: annotation.icon } : {}),
      ...(annotation.lineStyle ? { lineStyle: annotation.lineStyle } : {}),
      ...(annotation.lineWidth ? { lineWidth: annotation.lineWidth } : {}),
      ...(annotation.textVisibility !== undefined
        ? { textVisibility: annotation.textVisibility }
        : {}),
    };
    if (annotation.type !== 'query') {
      const { type, timestamp, endTimestamp } = annotation.key ?? {};
      if (!timestamp) {
        refusals.push(`manual annotation ${annotation.id} without a timestamp`);
        continue;
      }
      annotations.push({
        key: annotation.id,
        label,
        at: new Date(timestamp).toISOString(),
        ...(type === 'range' && endTimestamp
          ? { until: new Date(endTimestamp).toISOString() }
          : {}),
      });
      continue;
    }

    const index = indexOf(esql);
    const search = annotation.filter && searchOf(annotation.filter);
    if (!index || !annotation.timeField || !window) {
      refusals.push(`query annotation ${annotation.id} without an index, time field, or window`);
      continue;
    }
    const timeField = field(annotation.timeField);
    const where = [
      `${timeField} >= ${quote(window.from)}::DATETIME`,
      `${timeField} < ${quote(window.to)}::DATETIME`,
      ...(search ? [search] : []),
    ].join(' AND ');
    const query = `FROM ${index} | WHERE ${where} | KEEP ${timeField} | SORT ${timeField} | LIMIT ${ESQL_ROW_LIMIT}`;
    const response = await executeEsql(query);
    if (response.values.length >= ESQL_ROW_LIMIT) {
      refusals.push(`query annotation ${annotation.id} matches ${ESQL_ROW_LIMIT} or more events`);
      continue;
    }
    response.values.forEach(([at], row) => {
      annotations.push({
        key: `${annotation.id}:${row}`,
        label,
        at: new Date(String(at)).toISOString(),
      });
    });
    styles[annotation.id] = {
      ...(styles[annotation.id] as Json),
      query,
      ...(annotation.extraFields?.length ? { extraFields: annotation.extraFields } : {}),
    };
  }

  return {
    annotations,
    // Lens draws query events as one marker per x bucket, listing up to 10 of them; keys are `<annotation id>:<n>`.
    hints: { annotations: { grouping: 'x bucket', byAnnotation: styles } },
    refusals,
  };
};
