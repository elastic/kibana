/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import {
  INVESTIGATIONS_INDICATOR_LOOKUP_URL,
  getRecordUrl,
} from '../../../../common/investigations/constants';
import type {
  ExportItemsRequest,
  IndicatorLookupResponse,
} from '../../../../common/investigations/types';
import { toQuery } from '../../api/client';

/** Looks up other investigations that hold the same indicator values. One call per page. */
export const lookupIndicatorsExcluding = (
  http: HttpStart,
  values: string[],
  excludeRecordId: string
) =>
  http.fetch<IndicatorLookupResponse>(INVESTIGATIONS_INDICATOR_LOOKUP_URL, {
    method: 'GET',
    query: toQuery({ values, exclude_record_id: excludeRecordId }),
  });

export interface EvidenceExport {
  text: string;
  filename: string;
  contentType: string;
}

const FILENAME_PATTERN = /filename="?([^";]+)"?/i;

/** The exported text with the file name the server chose. */
export const exportEvidenceFile = async (
  http: HttpStart,
  recordId: string,
  request: ExportItemsRequest
): Promise<EvidenceExport> => {
  const { body, response } = await http.fetch<string | object>(
    `${getRecordUrl(recordId)}/evidence/_export`,
    { method: 'GET', query: toQuery(request), asResponse: true }
  );
  const disposition = response?.headers.get('content-disposition') ?? '';
  const filename = FILENAME_PATTERN.exec(disposition)?.[1] ?? `evidence.${request.format}`;
  return {
    text: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
    filename,
    contentType: response?.headers.get('content-type') ?? 'text/plain',
  };
};

export interface SavedObjectChoice {
  id: string;
  title: string;
  description: string;
  columns: string[];
}

interface SavedObjectsFindResponse {
  saved_objects: Array<{
    id: string;
    attributes: {
      title?: string;
      description?: string;
      columns?: string[];
      /** Newer Discover sessions keep their columns on the first tab. */
      tabs?: Array<{ attributes?: { columns?: string[] } }>;
    };
  }>;
}

/** Saved searches or Lens visualizations through the public saved objects API. */
export const findSavedObjectChoices = async (
  http: HttpStart,
  type: 'search' | 'lens'
): Promise<SavedObjectChoice[]> => {
  const { saved_objects: savedObjects } = await http.get<SavedObjectsFindResponse>(
    '/api/saved_objects/_find',
    {
      query: {
        type,
        per_page: 50,
        sort_field: 'updated_at',
      },
    }
  );
  return savedObjects.map(({ id, attributes }) => ({
    id,
    title: attributes.title ?? id,
    description: attributes.description ?? '',
    columns: attributes.columns ?? attributes.tabs?.[0]?.attributes?.columns ?? [],
  }));
};

export interface AlertChoice {
  id: string;
  index: string;
  ruleId: string | null;
  ruleName: string;
  severity: string;
  riskScore: number | null;
  host: string | null;
  user: string | null;
  timestamp: string | null;
  description: string;
  reason: string;
  fields: Array<[string, string]>;
}

interface AlertSearchResponse {
  hits: {
    hits: Array<{ _id: string; _index: string; _source: Record<string, unknown> }>;
  };
}

/** Alert documents store most fields flattened (`kibana.alert.rule.name`) and some nested. */
export const readField = (source: Record<string, unknown>, path: string): unknown => {
  if (path in source) {
    return source[path];
  }
  return path.split('.').reduce<unknown>((current, key) => {
    if (typeof current === 'object' && current !== null && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
};

const toText = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const HIGHLIGHTED_ALERT_FIELDS = [
  'host.name',
  'user.name',
  'process.name',
  'process.parent.name',
  'process.command_line',
  'source.ip',
  'destination.ip',
  'kibana.alert.workflow_status',
] as const;

const toAlertChoice = (hit: AlertSearchResponse['hits']['hits'][number]): AlertChoice => {
  const source = hit._source;
  const riskScore = Number(readField(source, 'kibana.alert.risk_score'));
  return {
    id: hit._id,
    index: hit._index,
    ruleId: toText(readField(source, 'kibana.alert.rule.uuid')) || null,
    ruleName: toText(readField(source, 'kibana.alert.rule.name')) || hit._id,
    severity: toText(readField(source, 'kibana.alert.severity')),
    riskScore: Number.isFinite(riskScore) ? riskScore : null,
    host: toText(readField(source, 'host.name')) || null,
    user: toText(readField(source, 'user.name')) || null,
    timestamp: toText(readField(source, '@timestamp')) || null,
    description: toText(readField(source, 'kibana.alert.rule.description')),
    reason: toText(readField(source, 'kibana.alert.reason')),
    fields: HIGHLIGHTED_ALERT_FIELDS.map(
      (field) => [field, toText(readField(source, field))] as [string, string]
    ).filter(([, value]) => value.length > 0),
  };
};

/** The newest alerts, optionally narrowed by a text match on rule name, host or user. */
export const searchAlerts = async (http: HttpStart, text: string): Promise<AlertChoice[]> => {
  const trimmed = text.trim();
  const filter = trimmed
    ? [
        {
          bool: {
            minimum_should_match: 1,
            should: ['kibana.alert.rule.name', 'host.name', 'user.name'].map((field) => ({
              wildcard: { [field]: { value: `*${trimmed}*`, case_insensitive: true } },
            })),
          },
        },
      ]
    : [];
  const response = await http.post<AlertSearchResponse>('/api/detection_engine/signals/search', {
    version: '2023-10-31',
    body: JSON.stringify({
      query: { bool: { filter } },
      size: 20,
      sort: [{ '@timestamp': 'desc' }],
    }),
  });
  return response.hits.hits.map(toAlertChoice);
};
