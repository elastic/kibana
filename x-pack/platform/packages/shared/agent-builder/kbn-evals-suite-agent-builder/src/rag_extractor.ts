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

interface SearchToolOutput {
  steps?: SearchToolStep[];
  results?: SearchToolResult[];
  searchToolResults?: SearchToolResult[];
}

const toRetrievedDoc = (reference?: SearchToolReference): RetrievedDoc | null => {
  const { id, index } = reference ?? {};
  return id && index ? { id, index } : null;
};

const extractRetrievedDocsFromResults = (results: SearchToolResult[] = []): RetrievedDoc[] => {
  return results.flatMap((result) => {
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

export const extractSearchRetrievedDocs = (output: TaskOutput): RetrievedDoc[] => {
  const outputValue = output as SearchToolOutput | undefined;

  if (outputValue && 'searchToolResults' in outputValue) {
    return extractRetrievedDocsFromResults(outputValue.searchToolResults);
  }

  const stepResults = (outputValue?.steps ?? [])
    .filter((step) => step.type === 'tool_call' && step.tool_id === 'platform.core.search')
    .flatMap((step) => step.results ?? []);
  const directResults = outputValue?.results ?? [];

  return [
    ...extractRetrievedDocsFromResults(stepResults),
    ...extractRetrievedDocsFromResults(directResults),
  ];
};
