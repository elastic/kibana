/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Canvas search with a KQL-like syntax.
//
//   plain text           fuzzy-match the name of any source/pipeline/routing/
//                        destination
//   source:foo           restrict to source names
//   destination:foo      restrict to destination names
//   pipeline:foo         restrict to pipeline names
//   route:foo            restrict to routing nodes
//
// A node matches if it satisfies ANY term. For each matched node we reveal what
// it can reach — the SAME directed flow the hover-spotlight uses (downstream
// from a source, upstream from a destination, both for a pipeline/routing node)
// — and show the UNION across all matches. Everything else is hidden (not just
// dimmed) so unrelated streams disappear. Matched nodes are reported separately
// so the UI can outline them.

import type { Edge, Node } from '@xyflow/react';
import { flowDirectionFor, reachableFlow } from './connected-flow';

export interface SearchResult {
  active: boolean;
  noResult: boolean; // query is active but nothing matched
  matchedIds: Set<string>; // nodes that literally matched a term (blue outline)
  hiddenNodeIds: Set<string>; // nodes outside every match's reachable flow
  hiddenEdgeIds: Set<string>;
}

type NodeKind = 'source' | 'pipeline' | 'routing' | 'destination';
interface Term {
  field?: NodeKind;
  value: string;
}

const FIELD_ALIASES: Record<string, NodeKind> = {
  source: 'source',
  pipeline: 'pipeline',
  destination: 'destination',
  route: 'routing',
  routing: 'routing',
};

// Lenient fuzzy match: case-insensitive substring OR in-order subsequence.
function fuzzy(text: string, q: string): boolean {
  const t = text.toLowerCase();
  const query = q.toLowerCase();
  if (!query) return true;
  if (t.includes(query)) return true;
  let i = 0;
  for (const ch of t) {
    if (ch === query[i]) i++;
    if (i === query.length) return true;
  }
  return false;
}

// The text a node is matched against. Routing nodes have no name, so they only
// surface via `route:` (or as part of a matched stream).
function searchText(node: Node): string {
  if (node.type === 'routing') return 'routing';
  if (node.type === 'routingEndpoint') return '';
  return String((node.data as { title?: string })?.title ?? '');
}

function parseQuery(raw: string): Term[] {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const colon = token.indexOf(':');
      if (colon > 0) {
        const field = FIELD_ALIASES[token.slice(0, colon).toLowerCase()];
        if (field) return { field, value: token.slice(colon + 1) };
      }
      return { value: token };
    });
}

function nodeMatchesTerm(node: Node, term: Term): boolean {
  if (node.type === 'routingEndpoint') return false;
  if (term.field && node.type !== term.field) return false;
  if (!term.field && node.type === 'routing') return false; // no name to bare-match
  return fuzzy(searchText(node), term.value);
}

const EMPTY: SearchResult = {
  active: false,
  noResult: false,
  matchedIds: new Set(),
  hiddenNodeIds: new Set(),
  hiddenEdgeIds: new Set(),
};

export function evaluateSearch(nodes: Node[], edges: Edge[], query: string): SearchResult {
  const terms = parseQuery(query);
  if (!terms.length) return EMPTY;

  // Nodes matching any term.
  const matchedIds = new Set<string>();
  nodes.forEach((node) => {
    if (terms.some((term) => nodeMatchesTerm(node, term))) matchedIds.add(node.id);
  });

  // No match → hide everything and signal "No results".
  if (matchedIds.size === 0) {
    return {
      active: true,
      noResult: true,
      matchedIds,
      hiddenNodeIds: new Set(nodes.map((n) => n.id)),
      hiddenEdgeIds: new Set(edges.map((e) => e.id)),
    };
  }

  // Visible = union of each match's directed reachable flow (same as hover).
  const visibleNodes = new Set<string>();
  const visibleEdges = new Set<string>();
  nodes.forEach((node) => {
    if (!matchedIds.has(node.id)) return;
    const reach = reachableFlow(node.id, edges, flowDirectionFor(node.type));
    reach.nodeIds.forEach((id) => visibleNodes.add(id));
    reach.edgeIds.forEach((id) => visibleEdges.add(id));
  });

  const hiddenNodeIds = new Set<string>();
  nodes.forEach((n) => {
    if (!visibleNodes.has(n.id)) hiddenNodeIds.add(n.id);
  });
  const hiddenEdgeIds = new Set<string>();
  edges.forEach((e) => {
    if (!visibleEdges.has(e.id)) hiddenEdgeIds.add(e.id);
  });

  return { active: true, noResult: false, matchedIds, hiddenNodeIds, hiddenEdgeIds };
}
