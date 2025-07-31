/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Writable } from 'utility-types';
import type {
  DashboardSavedObjectAttributes,
  SavedDashboardPanel,
} from '@kbn/dashboard-plugin/server';
import { cloneDeep, mapValues } from 'lodash';
import { AggregateQuery, Query } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery, replaceESQLQueryIndexPattern } from '@kbn/esql-utils';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { IndexPatternRef } from '@kbn/lens-plugin/public/types';
import type {
  FieldBasedIndexPatternColumn,
  GenericIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type { TextBasedLayerColumn } from '@kbn/lens-plugin/public/datasources/form_based/esql_layer/types';
import type { ContentPackSavedObject } from '../models';

export const INDEX_PLACEHOLDER = '<stream_name_placeholder>';

export const isIndexPlaceholder = (index: string) => index.startsWith(INDEX_PLACEHOLDER);

interface TraverseOptions {
  esqlQuery(query: string): string;
  indexPattern<T extends { title?: string }>(pattern: T): T;
  field<T extends GenericIndexPatternColumn | TextBasedLayerColumn>(field: T): T;
}

export function findConfiguration(savedObject: ContentPackSavedObject) {
  const patterns: Set<string> = new Set();
  const fields: Record<string, { type: string }> = {};

  locateConfiguration(savedObject, {
    esqlQuery(query: string) {
      getIndexPatternFromESQLQuery(query)
        .split(',')
        .forEach((p) => patterns.add(p));
      return query;
    },
    indexPattern<T extends { title?: string }>(pattern: T) {
      if (pattern.title) {
        pattern.title.split(',').forEach((p) => patterns.add(p));
      }
      return pattern;
    },
    field<T extends GenericIndexPatternColumn | TextBasedLayerColumn>(field: T): T {
      if ('fieldName' in field) {
        const { fieldName, meta } = field as TextBasedLayerColumn;
        if (meta?.esType) {
          fields[fieldName] = { type: meta.esType };
        }
      } else if ('sourceField' in field) {
        const { sourceField, dataType } = field as FieldBasedIndexPatternColumn;
        if (sourceField !== '___records___') {
          fields[sourceField] = { type: dataType };
        }
      }

      return field;
    },
  });

  return { patterns: [...patterns], fields };
}

export function replaceIndexPatterns(
  savedObject: ContentPackSavedObject,
  patternReplacements: Record<string, string>
) {
  return locateConfiguration(cloneDeep(savedObject), {
    esqlQuery(query: string) {
      return replaceESQLQueryIndexPattern(query, patternReplacements);
    },
    indexPattern<T extends { name?: string; title?: string }>(pattern: T) {
      const updatedPattern = pattern.title
        ?.split(',')
        .map((index) => patternReplacements[index] ?? index)
        .join(',');

      // data view references may be named after the index patterns they represent,
      // so we attempt to replace index patterns to avoid wrongly named data views
      const updatedName = pattern.name
        ?.split(',')
        .map((index) => patternReplacements[index] ?? index)
        .join(',');

      return {
        ...pattern,
        title: updatedPattern,
        name: updatedName,
      };
    },
    field(field: any) {
      return field;
    },
  });
}

function locateConfiguration(
  content: ContentPackSavedObject,
  options: TraverseOptions
): ContentPackSavedObject {
  if (content.type === 'index-pattern') {
    content.attributes = options.indexPattern(content.attributes);
  }

  if (content.type === 'dashboard') {
    const attributes = content.attributes as Writable<DashboardSavedObjectAttributes>;
    const panels = (JSON.parse(attributes.panelsJSON) as SavedDashboardPanel[]).map((panel) =>
      traversePanel(panel, options)
    );

    attributes.panelsJSON = JSON.stringify(panels);
  }

  if (content.type === 'lens') {
    content.attributes = traverseLensPanel(content.attributes, options);
  }

  return content;
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
    datasourceStates: { formBased, textBased },
  } = state;

  if (stateQuery && 'esql' in stateQuery) {
    stateQuery.esql = options.esqlQuery(stateQuery.esql);
  }

  if (formBased) {
    Object.values(formBased.layers).forEach((layer) => {
      Object.entries(layer.columns).forEach(([columnId, column]) => {
        layer.columns[columnId] = options.field(column);
      });
    });
  }

  if (textBased) {
    Object.values(textBased.layers).forEach((layer) => {
      if (layer.query?.esql) {
        layer.query.esql = options.esqlQuery(layer.query.esql);
      }

      layer.columns = layer.columns.map((column) => options.field(column));
    });

    if ('indexPatternRefs' in textBased) {
      textBased.indexPatternRefs = (textBased.indexPatternRefs as IndexPatternRef[]).map((ref) =>
        options.indexPattern(ref)
      );
    }
  }

  return panel;
}
