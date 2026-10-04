/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';

import { i18n } from '@kbn/i18n';
import type { RuntimeGraph } from '../types';
import { asKQL, getSelectedOrAllNodes } from './kql_encoder';
import { buildLikeThisButNotThisQuery, buildWorkspaceQuery } from './outlink_queries';

export interface OutlinkEncoder {
  id: string;
  title: string;
  description: string;
  encode: (runtimeGraph: RuntimeGraph, selectedNodeIds: readonly string[]) => string;
  type: 'kql' | 'lucene' | 'plain' | 'esq';
}

export const outlinkEncoders: OutlinkEncoder[] = [
  {
    id: 'kql-loose',
    title: i18n.translate('xpack.graph.outlinkEncoders.kqlLooseTitle', {
      defaultMessage: 'KQL OR query',
    }),
    description: i18n.translate('xpack.graph.outlinkEncoders.kqlLooseDescription', {
      defaultMessage: 'KQL query, compatible with Discover, Visualize, and Dashboards',
    }),
    encode(workspace, selectedNodeIds) {
      return asKQL(workspace, selectedNodeIds, 'or');
    },
    type: 'kql',
  },
  {
    id: 'kql',
    title: i18n.translate('xpack.graph.outlinkEncoders.kqlTitle', {
      defaultMessage: 'KQL AND query',
    }),
    description: i18n.translate('xpack.graph.outlinkEncoders.kqlLooseDescription', {
      defaultMessage: 'KQL query, compatible with Discover, Visualize, and Dashboards',
    }),
    encode(workspace, selectedNodeIds) {
      return asKQL(workspace, selectedNodeIds, 'and');
    },
    type: 'kql',
  },
  {
    id: 'esq-rison-loose',
    title: i18n.translate('xpack.graph.outlinkEncoders.esqRisonLooseTitle', {
      defaultMessage: 'elasticsearch OR query (rison encoded)',
    }),
    description: i18n.translate('xpack.graph.outlinkEncoders.esqRisonLooseDescription', {
      defaultMessage:
        'rison-encoded JSON, minimum_should_match=1, compatible with most Kibana URLs',
    }),
    encode(workspace, selectedNodeIds) {
      return encodeURIComponent(
        rison.encode(
          buildWorkspaceQuery(workspace, getSelectedOrAllNodes(workspace, selectedNodeIds), true)
        )
      );
    },
    type: 'esq',
  },
  {
    id: 'esq-rison',
    title: i18n.translate('xpack.graph.outlinkEncoders.esqRisonTitle', {
      defaultMessage: 'elasticsearch AND query (rison encoded)',
    }),
    description: i18n.translate('xpack.graph.outlinkEncoders.esqRisonDescription', {
      defaultMessage:
        'rison-encoded JSON, minimum_should_match=2, compatible with most Kibana URLs',
    }),
    encode(workspace, selectedNodeIds) {
      return encodeURIComponent(
        rison.encode(
          buildWorkspaceQuery(workspace, getSelectedOrAllNodes(workspace, selectedNodeIds))
        )
      );
    },
    type: 'esq',
  },
  {
    id: 'esq-similar-rison',
    title: i18n.translate('xpack.graph.outlinkEncoders.esqSimilarRisonTitle', {
      defaultMessage: 'elasticsearch more like this query (rison encoded)',
    }),
    description: i18n.translate('xpack.graph.outlinkEncoders.esqSimilarRisonDescription', {
      defaultMessage:
        'rison-encoded JSON, "like this but not this" type query to find missing docs',
    }),
    encode(workspace, selectedNodeIds) {
      return encodeURIComponent(
        rison.encode(
          buildLikeThisButNotThisQuery(workspace, getSelectedOrAllNodes(workspace, selectedNodeIds))
        )
      );
    },
    type: 'esq',
  },
  {
    id: 'esq-plain',
    title: i18n.translate('xpack.graph.outlinkEncoders.esqPlainTitle', {
      defaultMessage: 'elasticsearch query (plain encoding)',
    }),
    description: i18n.translate('xpack.graph.outlinkEncoders.esqPlainDescription', {
      defaultMessage: 'JSON encoded using standard url encoding',
    }),
    encode(workspace, selectedNodeIds) {
      return encodeURIComponent(
        JSON.stringify(
          buildWorkspaceQuery(workspace, getSelectedOrAllNodes(workspace, selectedNodeIds))
        )
      );
    },
    type: 'esq',
  },
  {
    id: 'text-plain',
    title: i18n.translate('xpack.graph.outlinkEncoders.textPlainTitle', {
      defaultMessage: 'plain text',
    }),
    description: i18n.translate('xpack.graph.outlinkEncoders.textPlainDescription', {
      defaultMessage: 'Text of selected vertex labels as a plain url-encoded string',
    }),
    encode(workspace, selectedNodeIds) {
      let q = '';
      const nodes = getSelectedOrAllNodes(workspace, selectedNodeIds);
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (i > 0) {
          q += ' ';
        }
        q += node.label;
      }
      return encodeURIComponent(q);
    },
    type: 'plain',
  },
  {
    id: 'text-lucene',
    title: i18n.translate('xpack.graph.outlinkEncoders.textLuceneTitle', {
      defaultMessage: 'Lucene-escaped text',
    }),
    description: i18n.translate('xpack.graph.outlinkEncoders.textLuceneDescription', {
      defaultMessage: 'Text of selected vertex labels with any Lucene special characters encoded',
    }),
    encode(workspace, selectedNodeIds) {
      let q = '';
      const nodes = getSelectedOrAllNodes(workspace, selectedNodeIds);
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (i > 0) {
          q += ' ';
        }
        q += node.label;
      }
      // escape the Lucene special characters https://lucene.apache.org/core/2_9_4/queryparsersyntax.html#Escaping Special Characters
      const luceneChars = '+-&|!(){}[]^"~*?:\\';
      q = q
        .split('')
        .map((char) => (luceneChars.includes(char) ? `\\${char}` : char))
        .join('');
      return encodeURIComponent(q);
    },
    type: 'lucene',
  },
];
