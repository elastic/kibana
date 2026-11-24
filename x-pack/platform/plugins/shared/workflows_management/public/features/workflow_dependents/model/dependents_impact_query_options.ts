/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { INTERNAL_API_VERSION } from '../../../../common/lib/api_constants';
import { getWorkflowDependentsImpactPath } from '../../../../common/lib/workflow_dependents/api';
import type {
  WorkflowDependentsImpactRequestBody,
  WorkflowDependentsImpactResponse,
} from '../../../../common/lib/workflow_dependents/api';

/**
 * Query for how `draftYaml` (or the saved version when omitted) affects connected workflows. The
 * saved version is part of the key, so a save refreshes the analysis.
 */
export const dependentsImpactQueryOptions = (
  http: HttpStart,
  { id, savedVersion }: { id: string; savedVersion?: string },
  draftYaml: string | undefined
) => ({
  queryKey: ['workflowDependentsImpact', id, savedVersion, draftYaml ?? null],
  queryFn: ({ signal }: { signal?: AbortSignal }) =>
    http.post<WorkflowDependentsImpactResponse>(getWorkflowDependentsImpactPath(id), {
      version: INTERNAL_API_VERSION,
      body: JSON.stringify(
        (draftYaml === undefined
          ? {}
          : { yaml: draftYaml }) satisfies WorkflowDependentsImpactRequestBody
      ),
      signal,
    }),
  staleTime: 30_000,
  retry: false,
});
