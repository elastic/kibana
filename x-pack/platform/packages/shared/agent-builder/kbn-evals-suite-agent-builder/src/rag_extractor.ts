/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetrievedDoc, TaskOutput } from '@kbn/evals';

interface SearchToolReference {
  id?: string;
  index?: string;
}

interface SearchToolResource {
  reference?: SearchToolReference;
}

interface SearchToolResult {
  data?: {
    reference?: SearchToolReference;
    resources?: SearchToolResource[];
  };
}

interface SearchToolStep {
  type: string;
  tool_id?: string;
  results?: SearchToolResult[];
}

const toRetrievedDoc = (reference?: SearchToolReference): RetrievedDoc | null => {
  const { id, index } = reference ?? {};
  return id && index ? { id, index } : null;
};

export const extractSearchRetrievedDocs = (output: TaskOutput): RetrievedDoc[] => {
  const steps = (output as { steps?: SearchToolStep[] } | undefined)?.steps ?? [];

  return steps
    .filter((step) => step.type === 'tool_call' && step.tool_id === 'platform.core.search')
    .flatMap((step) => step.results ?? [])
    .flatMap((result) => {
      const docs: RetrievedDoc[] = [];
      const directReferenceDoc = toRetrievedDoc(result.data?.reference);
      if (directReferenceDoc) {
        docs.push(directReferenceDoc);
      }

      for (const resource of result.data?.resources ?? []) {
        const resourceDoc = toRetrievedDoc(resource.reference);
        if (resourceDoc) {
          docs.push(resourceDoc);
        }
      }

      return docs;
    });
};
