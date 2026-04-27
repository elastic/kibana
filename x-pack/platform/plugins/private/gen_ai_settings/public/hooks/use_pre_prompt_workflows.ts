/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';

interface Workflow {
  id: string;
  name: string;
}

export function usePrePromptWorkflows({ enabled }: { enabled: boolean }): {
  workflows: Workflow[];
  isLoading: boolean;
} {
  const {
    services: { agentBuilder },
  } = useKibana();

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['genAiSettings', 'prePromptWorkflows'],
    enabled,
    queryFn: async () => {
      if (!agentBuilder) {
        return [];
      }
      const response = await agentBuilder.tools.listWorkflows({ page: 1, limit: 1000 });
      return response.results.map((workflow) => ({ id: workflow.id, name: workflow.name }));
    },
  });

  return { workflows, isLoading };
}
