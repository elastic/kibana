/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuntimeGraph, WorkspaceNode } from '../types';
import { buildNodeQuery } from '../services/workspace/graph_request_builders';
import { isTopLevelNode, unpackGroupedNodes } from '../services/workspace/runtime_grouping';

export const buildWorkspaceQuery = (
  runtimeGraph: RuntimeGraph,
  nodes: WorkspaceNode[],
  loose = false
) => {
  const should = nodes
    .filter(isTopLevelNode)
    .map((node) => buildNodeQuery(unpackGroupedNodes([node], runtimeGraph.edges)));
  return {
    bool: {
      should,
      minimum_should_match: Math.min(should.length, loose ? 1 : 2),
    },
  };
};

export const buildLikeThisButNotThisQuery = (
  runtimeGraph: RuntimeGraph,
  nodes: WorkspaceNode[]
) => {
  const textByField: Record<string, string> = {};
  nodes.forEach((node) => {
    const existingText = textByField[node.data.field];
    textByField[node.data.field] = existingText ? `${existingText} ${node.label}` : node.label;
  });
  const should = Object.values(textByField).map((like) => ({
    more_like_this: {
      like,
      min_term_freq: 1,
      minimum_should_match: '20%',
      min_doc_freq: 1,
      boost_terms: 2,
      max_query_terms: 25,
    },
  }));

  const excludesByField: Record<string, string[]> = {};
  [...runtimeGraph.nodes, ...runtimeGraph.blocklistedNodes].forEach((node) => {
    (excludesByField[node.data.field] ??= []).push(node.data.term);
  });
  const negativeShould = Object.entries(excludesByField).map(([field, terms]) => ({
    terms: { [field]: terms },
  }));

  return {
    boosting: {
      negative_boost: 0.0001,
      negative: { bool: { should: negativeShould } },
      positive: { bool: { should } },
    },
  };
};
