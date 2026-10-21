/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptivePanel } from '../../../model/adaptive_dashboard';
import { formatFromLensColumn, type LensColumnFormat } from '../../lens/format_resolver';

import { type LowerPanelArgs, unsupportedPanel } from './types';

interface SavedSearchAttributes {
  title?: string;
  description?: string;
  columns?: string[];
  sort?: Array<[string, string] | Record<string, string>>;
  sampleSize?: number;
  kibanaSavedObjectMeta?: {
    searchSourceJSON?: string;
  };
  /** A Discover session's tabs; each carries the attributes a saved search had at its top level. */
  tabs?: Array<{ id?: string; label?: string; attributes?: SavedSearchAttributes }>;
}

// The saved search embeddable's default rows when the session sets no sample size.
const DEFAULT_SAMPLE_SIZE = 100;

/**
 * The attributes a dashboard panel shows: a Discover session's selected tab (the panel's `selectedTabId`, else its
 * first tab, as `get_search_embeddable_factory` does), or a classic saved search's own.
 */
export const selectedAttributes = (
  attributes: SavedSearchAttributes,
  panel: { embeddableConfig?: Record<string, unknown> }
): SavedSearchAttributes => {
  const tabs = attributes.tabs ?? [];
  if (tabs.length === 0) {
    return attributes;
  }
  const selected =
    (panel.embeddableConfig?.selectedTabId as string | undefined) ??
    (panel.embeddableConfig?.selected_tab_id as string | undefined);
  const tab = tabs.find(({ id }) => id === selected) ?? tabs[0];
  return { ...attributes, ...(tab?.attributes ?? {}) };
};

const escapeEsqlField = (field: string) => `\`${field.replace(/`/g, '``')}\``;

/** The session's sort as ES|QL, in Discover's order; each entry is `[field, direction]` or `{ field: direction }`. */
const sortClause = (sort: SavedSearchAttributes['sort']): string | undefined => {
  const keys = (sort ?? []).flatMap((entry) =>
    Array.isArray(entry) ? [entry] : (Object.entries(entry) as Array<[string, string]>)
  );
  return keys.length > 0
    ? `SORT ${keys
        .map(
          ([field, direction]) =>
            `${escapeEsqlField(field)} ${direction === 'asc' ? 'ASC' : 'DESC'}`
        )
        .join(', ')}`
    : undefined;
};

interface SavedSearchSearchSource {
  index?: string;
  indexRefName?: string;
  query?: { query: string; language?: 'kuery' | 'lucene' | 'esql' };
  filter?: Array<Record<string, unknown>>;
}

const parseSearchSource = (
  raw: string | undefined,
  diagnostics: LowerPanelArgs['diagnostics']
): SavedSearchSearchSource | undefined => {
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as SavedSearchSearchSource;
  } catch (error) {
    diagnostics.push({
      level: 'warn',
      code: 'dashboard.saved-search-source-malformed',
      message: `searchSourceJSON could not be parsed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    return undefined;
  }
};

export const lowerSavedSearchPanel = ({
  panel,
  panelEnvelope,
  refId,
  diagnostics,
  resolveReferenceTitle,
  resolveDataViewFieldFormats,
  ...rest
}: LowerPanelArgs): AdaptivePanel => {
  const stored = panelEnvelope?.attributes as SavedSearchAttributes | undefined;
  const attributes = stored
    ? selectedAttributes(stored, panel as { embeddableConfig?: Record<string, unknown> })
    : undefined;
  const title = panel.title ?? stored?.title ?? 'Saved search';
  if (!attributes) {
    diagnostics.push({
      level: 'warn',
      code: 'dashboard.saved-search-not-resolved',
      message: `saved search "${refId ?? '<inline>'}" has no attributes`,
    });
    return unsupportedPanel({
      panel,
      panelEnvelope,
      refId,
      diagnostics,
      resolveReferenceTitle,
      resolveDataViewFieldFormats,
      ...rest,
      refType: 'search',
      reason: 'saved search envelope not resolved',
      title,
    });
  }

  const searchSource = parseSearchSource(
    attributes.kibanaSavedObjectMeta?.searchSourceJSON,
    diagnostics
  );
  const resolvedIndexTitle = ((): string | undefined => {
    if (searchSource?.index) {
      return searchSource.index;
    }
    if (searchSource?.indexRefName && resolveReferenceTitle) {
      const ref = panelEnvelope?.references?.find((r) => r.name === searchSource.indexRefName);
      if (ref) {
        return resolveReferenceTitle(ref.name, ref.id, ref.type);
      }
    }
    return undefined;
  })();
  const fieldFormats = ((): Record<string, LensColumnFormat> | undefined => {
    if (searchSource?.indexRefName && resolveDataViewFieldFormats) {
      const ref = panelEnvelope?.references?.find((r) => r.name === searchSource.indexRefName);
      if (ref) {
        return resolveDataViewFieldFormats(ref.name, ref.id, ref.type);
      }
    }
    return undefined;
  })();

  let esql: string;
  let searchSourceContext:
    | { query?: { query: string; language: string }; filters?: Array<Record<string, unknown>> }
    | undefined;
  if (searchSource?.query?.language === 'esql') {
    esql = searchSource.query.query;
  } else {
    const index = resolvedIndexTitle ?? 'logs-*';
    // As Discover runs it: the data view, the session's sort, its sample size. Its query and filters go with the
    // request as DSL (`searchSource`), so KQL, Lucene and every filter type apply as they do in Kibana.
    esql = [
      `FROM ${index}`,
      sortClause(attributes.sort),
      `LIMIT ${attributes.sampleSize ?? DEFAULT_SAMPLE_SIZE}`,
    ]
      .filter(Boolean)
      .join(' | ');
    if (!resolvedIndexTitle) {
      diagnostics.push({
        level: 'warn',
        code: 'dashboard.saved-search-index-fallback',
        message: `saved search "${refId ?? '<inline>'}" had no resolvable index; using \`logs-*\``,
      });
    }
    const query = searchSource?.query;
    const filters = searchSource?.filter ?? [];
    if ((query && query.query) || filters.length > 0) {
      searchSourceContext = {
        ...(query && query.query
          ? { query: { query: query.query, language: query.language ?? 'kuery' } }
          : {}),
        ...(filters.length > 0 ? { filters } : {}),
      };
    }
  }

  const columns = (attributes.columns ?? []).map((id) => {
    const format = formatFromLensColumn(
      {
        operationType: 'raw',
        sourceField: id,
        dataType: 'number',
        label: id,
      },
      fieldFormats
    );
    return {
      id,
      label: id,
      ...(format ? { format } : {}),
    };
  });
  if (columns.length === 0) {
    diagnostics.push({
      level: 'info',
      code: 'dashboard.saved-search-no-columns',
      message: 'saved search had no explicit columns; showing the documents',
    });
    columns.push({ id: '_source', label: 'Source' });
  }

  return {
    type: 'savedSearch',
    title,
    query: { esql, ...(searchSourceContext ? { searchSource: searchSourceContext } : {}) },
    columns,
  };
};
