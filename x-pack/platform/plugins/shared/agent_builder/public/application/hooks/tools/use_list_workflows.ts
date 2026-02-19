/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { HttpSetup } from '@kbn/core/public';
import type { WorkflowOption } from '../../components/common/workflow_combo_box';
import { queryKeys } from '../../query_keys';

interface UseListWorkflowsKibanaServices {
  http?: HttpSetup;
}

interface ListWorkflowsResponse {
  results: WorkflowOption[];
}

export const useListWorkflows = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const {
    services: { http },
  } = useKibana<UseListWorkflowsKibanaServices>();

  const result = useQuery({
    queryKey: queryKeys.tools.workflows.list(),
    queryFn: async (): Promise<ListWorkflowsResponse> => {
      if (!http) {
        return { results: [] };
      }
      const response = await http.post<ListWorkflowsResponse>('/api/workflows/search', {
        body: JSON.stringify({
          size: 1000,
          page: 1,
          enabled: [true],
        }),
      });
      return response ?? { results: [] };
    },
    enabled: enabled && !!http,
  });

  return {
    ...result,
    data: result.data?.results,
  };
};
