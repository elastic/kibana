/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { casesQueriesKeys } from '../constants';

interface UseGetWorkflowTagsParams {
  /** Skip the query when false (e.g. when the workflows section is hidden). */
  enabled: boolean;
}

/**
 * Returns the set of workflow tags available in the current space, used to
 * populate the settings-page picker with searchable suggestions.
 * Failures degrade gracefully — the picker still allows custom tags.
 */
export const useGetWorkflowTags = ({ enabled }: UseGetWorkflowTagsParams) => {
  const api = useWorkflowsApi();

  return useQuery({
    queryKey: casesQueriesKeys.workflowTagAggs(),
    queryFn: () => api.getAggs({ fields: ['tags'] }),
    enabled,
    select: (aggs): string[] => (aggs.tags ?? []).map(({ key }) => key),
  });
};
