/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdvancedSettings, WorkspaceField } from '../../types/app_state';

type Query = Record<string, object>;

interface RequestNode {
  data: {
    field: string;
    term: string;
    weight?: number;
  };
}

interface VertexRequest {
  field: string;
  size: number | undefined;
  min_doc_count: number;
  exclude?: string[];
}

interface ConnectionRequest {
  vertices?: VertexRequest[];
  connections?: ConnectionRequest;
}

export const buildExploreControls = (settings: AdvancedSettings) => {
  const controls: {
    use_significance: boolean;
    sample_size: number;
    timeout: number;
    sample_diversity?: { field: string; max_docs_per_value: number };
  } = {
    use_significance: settings.useSignificance,
    sample_size: settings.sampleSize,
    timeout: Number.parseInt(String(settings.timeoutMillis), 10),
  };

  if (settings.sampleDiversityField != null) {
    controls.sample_diversity = {
      field: settings.sampleDiversityField.name,
      max_docs_per_value: settings.maxValuesPerDoc,
    };
  }

  return controls;
};

export const buildFillConnectionsRequest = (nodeQueries: Query[]) => {
  const filters = Object.fromEntries(nodeQueries.map((query, index) => [index, query]));

  return {
    size: 0,
    query: {
      bool: {
        // Only match docs that share 2 nodes so can help describe their relationship
        minimum_should_match: 2,
        should: nodeQueries,
      },
    },
    aggs: {
      matrix: {
        adjacency_matrix: {
          separator: '|',
          filters,
        },
      },
    },
  };
};

export const buildExpandExploreRequest = ({
  startNodes,
  existingNodes,
  blocklistedNodes,
  fields,
  targetFields = fields,
  settings,
}: {
  startNodes: RequestNode[];
  existingNodes: RequestNode[];
  blocklistedNodes: RequestNode[];
  fields: WorkspaceField[];
  targetFields?: WorkspaceField[];
  settings: AdvancedSettings;
}) => {
  const nodesByField: Record<string, Array<{ term: string; boost: number | undefined }>> = {};
  const excludesByField: Record<string, string[]> = {};

  blocklistedNodes.forEach((node) => {
    const excludes = (excludesByField[node.data.field] ??= []);
    if (!excludes.includes(node.data.term)) {
      excludes.push(node.data.term);
    }
  });
  existingNodes.forEach((node) => {
    (excludesByField[node.data.field] ??= []).push(node.data.term);
  });
  startNodes.forEach((node) => {
    (nodesByField[node.data.field] ??= []).push({
      term: node.data.term,
      boost: node.data.weight,
    });
    const excludes = (excludesByField[node.data.field] ??= []);
    if (!excludes.includes(node.data.term)) {
      excludes.push(node.data.term);
    }
  });

  const vertices = Object.entries(nodesByField).map(([field, include]) => ({
    field,
    include,
    min_doc_count: Number.parseInt(String(settings.minDocCount), 10),
  }));
  const connectionVertices = targetFields.map((targetField) => ({
    field: targetField.name,
    size: (targetField.hopSize ?? 0) > 0 ? targetField.hopSize : targetField.lastValidHopSize,
    min_doc_count: Number.parseInt(String(settings.minDocCount), 10),
    exclude: excludesByField[targetField.name],
  }));

  return {
    controls: buildExploreControls(settings),
    vertices,
    connections: { vertices: connectionVertices },
  };
};

export const buildSearchExploreRequest = ({
  query,
  fields,
  numHops,
  blocklistedNodes,
  settings,
}: {
  query: Query;
  fields: WorkspaceField[];
  numHops: number;
  blocklistedNodes: RequestNode[];
  settings: AdvancedSettings;
}) => {
  const excludesByField: Record<string, string[]> = {};
  const excludedTerms: Array<{ term: Record<string, string> }> = [];

  blocklistedNodes.forEach((node) => {
    const { field, term } = node.data;
    (excludesByField[field] ??= []).push(term);
    excludedTerms.push({ term: { [field]: term } });
  });

  const rootStep: ConnectionRequest = {};
  let step = rootStep;
  for (let hop = 0; hop < numHops; hop++) {
    step.vertices = fields.map(({ name: field, hopSize }) => {
      const vertex: VertexRequest = {
        field,
        size: hopSize,
        min_doc_count: Number.parseInt(String(settings.minDocCount), 10),
      };
      const excludes = excludesByField[field];
      if (excludes) {
        vertex.exclude = excludes;
      }
      return vertex;
    });

    if (hop < numHops - 1) {
      step.connections = {};
      step = step.connections;
    }
  }

  const filteredQuery =
    excludedTerms.length === 0 ? query : { bool: { must: [query], must_not: excludedTerms } };

  return {
    query: filteredQuery,
    controls: buildExploreControls(settings),
    connections: rootStep.connections,
    vertices: rootStep.vertices,
  };
};
