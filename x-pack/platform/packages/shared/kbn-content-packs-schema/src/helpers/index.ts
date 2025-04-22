/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DashboardAttributes,
  SavedDashboardPanel,
} from '@kbn/dashboard-plugin/common/content_management/v2';
import { cloneDeep, mapValues, uniq } from 'lodash';
import { AggregateQuery, Query } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery, replaceESQLQueryIndexPattern } from '@kbn/esql-utils';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { IndexPatternRef } from '@kbn/lens-plugin/public/types';
import type { ContentPackSavedObject } from '../models';

export const INDEX_PLACEHOLDER = '<stream_name_placeholder>';

export const isIndexPlaceholder = (index: string) => index.startsWith(INDEX_PLACEHOLDER);

interface TraverseOptions {
  esqlQuery(query: string): string;
  indexPattern<T extends { name?: string; title?: string }>(pattern: T): T;
}

export function findIndexPatterns(savedObject: ContentPackSavedObject) {
  const patterns: string[] = [];

  locateIndexPatterns(savedObject, {
    esqlQuery(query: string) {
      patterns.push(...getIndexPatternFromESQLQuery(query).split(','));
      return query;
    },
    indexPattern<T extends { title?: string }>(pattern: T) {
      if (pattern.title) {
        patterns.push(...pattern.title.split(','));
      }
      return pattern;
    },
  });

  return uniq(patterns);
}

export function replaceIndexPatterns(
  savedObject: ContentPackSavedObject,
  replacements: Record<string, string>
) {
  return locateIndexPatterns(cloneDeep(savedObject), {
    esqlQuery(query: string) {
      return replaceESQLQueryIndexPattern(query, replacements);
    },
    indexPattern<T extends { name?: string; title?: string }>(pattern: T) {
      const updatedPattern = pattern.title
        ?.split(',')
        .map((index) => replacements[index] ?? index)
        .join(',');

      return {
        ...pattern,
        name: updatedPattern,
        title: updatedPattern,
      };
    },
  });
}

function locateIndexPatterns(
  object: ContentPackSavedObject,
  options: TraverseOptions
): ContentPackSavedObject {
  const content = object;

  if (content.type === 'index-pattern') {
    content.attributes = options.indexPattern(content.attributes);
  }

  if (content.type === 'dashboard') {
    const attributes = content.attributes as DashboardAttributes;
    const panels = (JSON.parse(attributes.panelsJSON) as SavedDashboardPanel[]).map((panel) =>
      traversePanel(panel, options)
    );

    attributes.panelsJSON = JSON.stringify(panels);
  }

  return object;
}

function traversePanel(panel: SavedDashboardPanel, options: TraverseOptions) {
  if (panel.type === 'lens') {
    const config = panel.embeddableConfig as {
      query?: Query | AggregateQuery;
      attributes?: LensAttributes;
    };
    if (config.query && 'esql' in config.query) {
      config.query.esql = options.esqlQuery(config.query.esql);
    }

    if (config.attributes) {
      traverseLensPanel(config.attributes as LensAttributes, options);
    }
  }

  return panel;
}

function traverseLensPanel(panel: LensAttributes, options: TraverseOptions) {
  const state = panel.state;

  if (state.adHocDataViews) {
    state.adHocDataViews = mapValues(state.adHocDataViews, (dataView) =>
      options.indexPattern(dataView)
    );
  }

  const {
    query: stateQuery,
    datasourceStates: { textBased },
  } = state;

  if (stateQuery && 'esql' in stateQuery) {
    stateQuery.esql = options.esqlQuery(stateQuery.esql);
  }

  if (textBased) {
    Object.values(textBased.layers).forEach((layer) => {
      if (layer.query?.esql) {
        layer.query.esql = options.esqlQuery(layer.query.esql);
      }
    });

    if ('indexPatternRefs' in textBased) {
      textBased.indexPatternRefs = (textBased.indexPatternRefs as IndexPatternRef[]).map((ref) =>
        options.indexPattern(ref)
      );
    }
  }

  return panel;
}
