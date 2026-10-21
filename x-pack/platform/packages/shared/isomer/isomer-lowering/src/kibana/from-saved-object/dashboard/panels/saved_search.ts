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
  sort?: Array<[string, 'asc' | 'desc']>;
  kibanaSavedObjectMeta?: {
    searchSourceJSON?: string;
  };
}

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
  const attributes = panelEnvelope?.attributes as SavedSearchAttributes | undefined;
  const title = panel.title ?? attributes?.title ?? 'Saved search';
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
  if (searchSource?.query?.language === 'esql') {
    esql = searchSource.query.query;
  } else {
    const index = resolvedIndexTitle ?? 'logs-*';
    esql = `FROM ${index} | LIMIT 50`;
    if (!resolvedIndexTitle) {
      diagnostics.push({
        level: 'warn',
        code: 'dashboard.saved-search-index-fallback',
        message: `saved search "${refId ?? '<inline>'}" had no resolvable index; using \`logs-*\``,
      });
    }
    if (searchSource?.query?.query) {
      diagnostics.push({
        level: 'info',
        code: 'dashboard.saved-search-query-not-translated',
        message: `saved search query (${
          searchSource.query.language ?? 'kuery'
        }) not translated to ES|QL; using \`FROM ${index} | LIMIT 50\``,
      });
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
      message: 'saved search had no explicit columns; using `_source` only',
    });
    columns.push({ id: '_source', label: 'Source' });
  }

  return {
    type: 'savedSearch',
    title,
    query: { esql },
    columns,
  };
};
