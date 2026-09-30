/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdvancedSettings, WorkspaceField } from '../../types/app_state';
import type { WorkspaceNode } from '../../types/workspace_state';

type Query = Record<string, object>;

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
  blocklistedNodes: WorkspaceNode[];
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
