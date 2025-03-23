/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, uniq } from 'lodash';
import { ESQLSource, EsqlQuery } from '@kbn/esql-ast';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { ContentPackSavedObject } from '@kbn/streams-schema';
import {
  DashboardAttributes,
  SavedDashboardPanel,
} from '@kbn/dashboard-plugin/common/content_management/v2';
import { TextBasedPrivateState } from '@kbn/lens-plugin/public/datasources/text_based/types';
import { LensSerializedState } from '@kbn/lens-plugin/public';

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
  return traversePanels(savedObject, {
    esqlQuery(query: string) {
      return replaceESQLIndexPattern(query, replacements);
    },
    indexPattern<T extends { title?: string }>(pattern: T) {
      return {
        ...pattern,
        title: pattern.title
          ?.split(',')
          .map((pattern) => replacements[pattern] ?? pattern)
          .join(','),
      };
    },
  });
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

  for (let j = 0; j < panels.length; j++) {
    const panel = panels[j];
    if (panel.type === 'lens') {
      const { query: rootQuery, attributes } = panel.embeddableConfig as LensSerializedState;
      if (rootQuery && 'esql' in rootQuery) {
        rootQuery.esql = options.esqlQuery(rootQuery.esql);
      }

      if (attributes?.state) {
        const {
          query: stateQuery,
          datasourceStates: { textBased },
        } = attributes.state;

        if (stateQuery && 'esql' in stateQuery) {
          stateQuery.esql = options.esqlQuery(stateQuery.esql);
        }

        if (textBased) {
          const textBasedState = textBased as TextBasedPrivateState;
          Object.values(textBasedState.layers).forEach((layer) => {
            if (layer.query?.esql) {
              layer.query.esql = options.esqlQuery(layer.query.esql);
            }
          });

          textBasedState.indexPatternRefs = textBasedState.indexPatternRefs.map((ref) =>
            options.indexPattern(ref)
          );
        }

        if (attributes.state.adHocDataViews) {
          attributes.state.adHocDataViews = mapValues(attributes.state.adHocDataViews, (dataView) =>
            options.indexPattern(dataView)
          );
        }
      }
    }
  }

  attributes.panelsJSON = JSON.stringify(panels);
  return savedObject;
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
