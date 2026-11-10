/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaterializeContext } from '../../common';
import type { MaterializeContextOverride } from './types';

/**
 * The context a request runs in: the parent's, with the override's fields in place of the
 * parent's, its filters added to the parent's, and the parent's filters and query dropped when it
 * ignores global filters.
 */
export const mergeContext = (
  parent: MaterializeContext,
  override?: MaterializeContextOverride
): MaterializeContext => {
  if (!override) {
    return parent;
  }
  const { ignoreGlobalFilters, filters, query, timeRange, esqlVariables, timeZone, locale } =
    override;
  const inherited = ignoreGlobalFilters
    ? { ...parent, filters: undefined, query: undefined }
    : parent;
  const mergedFilters = [...(inherited.filters ?? []), ...(filters ?? [])];
  const mergedTimeRange = timeRange ?? inherited.timeRange;
  const mergedQuery = query ?? inherited.query;
  const mergedEsqlVariables = esqlVariables ?? inherited.esqlVariables;
  const mergedTimeZone = timeZone ?? inherited.timeZone;
  const mergedLocale = locale ?? inherited.locale;
  return {
    ...(mergedTimeRange ? { timeRange: mergedTimeRange } : {}),
    ...(mergedQuery ? { query: mergedQuery } : {}),
    ...(mergedFilters.length > 0 ? { filters: mergedFilters } : {}),
    ...(mergedEsqlVariables ? { esqlVariables: mergedEsqlVariables } : {}),
    ...(mergedTimeZone ? { timeZone: mergedTimeZone } : {}),
    ...(mergedLocale ? { locale: mergedLocale } : {}),
  };
};
