/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, uniq } from 'lodash';
import { ESQLSource, EsqlQuery } from '@kbn/esql-ast';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { ContentPackSavedObject } from '@kbn/streams-schema';
import type {
  DashboardAttributes,
  SavedDashboardPanel,
} from '@kbn/dashboard-plugin/common/content_management/v2';
import type { LensSerializedState } from '@kbn/lens-plugin/public';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { IndexPatternRef } from '@kbn/lens-plugin/public/types';

export const INDEX_PLACEHOLDER = '<stream_name_placeholder>';

export const isIndexPlaceholder = (index: string) => index.startsWith(INDEX_PLACEHOLDER);

export function findIndexPatterns(
  savedObject: ContentPackSavedObject<DashboardAttributes>['content']
) {
  const patterns: string[] = [];

  traversePanels(savedObject, {
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
  savedObject: ContentPackSavedObject<DashboardAttributes>['content'],
  replacements: Record<string, string>
) {
  const updatedPanels = traversePanels(savedObject, {
    esqlQuery(query: string) {
      return replaceESQLIndexPattern(query, replacements);
    },
    indexPattern<T extends { title?: string }>(pattern: T) {
      return {
        ...pattern,
        title: pattern.title
          ?.split(',')
          .map((index) => replacements[index] ?? index)
          .join(','),
      };
    },
  });

  return {
    ...savedObject,
    attributes: { ...savedObject.attributes, panelsJSON: JSON.stringify(updatedPanels) },
  };
}

export function traversePanels(
  savedObject: ContentPackSavedObject<DashboardAttributes>['content'],
  options: {
    esqlQuery(query: string): string;
    indexPattern<T extends { title?: string }>(pattern: T): T;
  }
) {
  const attributes = savedObject.attributes as DashboardAttributes;
  const panels = JSON.parse(attributes.panelsJSON) as SavedDashboardPanel[];

  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    if (panel.type === 'lens') {
      const { query: rootQuery, attributes: lensAttributes } =
        panel.embeddableConfig as LensSerializedState;
      if (rootQuery && 'esql' in rootQuery) {
        rootQuery.esql = options.esqlQuery(rootQuery.esql);
      }

      const state = (lensAttributes as LensAttributes).state;

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
          textBased.indexPatternRefs = (textBased.indexPatternRefs as IndexPatternRef[]).map(
            (ref) => options.indexPattern(ref)
          );
        }
      }
    }
  }

  return panels;
}

const replaceESQLIndexPattern = (esql: string, replacements: Record<string, string>) => {
  const query = EsqlQuery.fromSrc(esql);
  const sourceCommand = query.ast.commands.find(({ name }) => ['from', 'metrics'].includes(name));
  const args = (sourceCommand?.args ?? []) as ESQLSource[];
  args.forEach((arg) => {
    if (arg.sourceType === 'index' && arg.index && replacements[arg.index]) {
      arg.index = replacements[arg.index];
    }
  });
  return query.print();
};
