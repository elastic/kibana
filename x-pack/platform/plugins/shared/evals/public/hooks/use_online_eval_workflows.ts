/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { parseYamlToJSONWithoutValidation, stringifyWorkflowDefinition } from '@kbn/workflows-yaml';
import {
  buildOnlineEvalWorkflowYaml,
  ONLINE_EVAL_WORKFLOW_TAG,
  type OnlineEvalWorkflowConfig,
  parseOnlineEvalWorkflowYaml,
} from '../../common/online_evals/workflow_yaml';
import { queryKeys } from '../query_keys';

const WORKFLOWS_API_BASE_URL = '/api/workflows';
const WORKFLOWS_API_VERSION = '2023-10-31';

const getWorkflowUrl = (workflowId: string) =>
  `${WORKFLOWS_API_BASE_URL}/workflow/${encodeURIComponent(workflowId)}`;

interface WorkflowListResponse {
  page: number;
  size: number;
  total: number;
  results: WorkflowListItem[];
}

interface WorkflowListItem {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  tags?: string[];
  yaml?: string;
}

interface WorkflowDetail {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  tags: string[];
  yaml: string;
}

interface WorkflowYamlSource {
  id: string;
  yaml?: string;
}

interface UpdateWorkflowPayload {
  name: string;
  description?: string;
  enabled: boolean;
  tags: string[];
  yaml: string;
}

export interface OnlineEvalWorkflowListItem {
  id: string;
  name: string;
  enabled: boolean;
  yaml: string;
  parsedConfig?: ReturnType<typeof parseOnlineEvalWorkflowYaml>;
}

export interface OnlineEvalWorkflowsListResponse {
  page: number;
  size: number;
  total: number;
  workflows: OnlineEvalWorkflowListItem[];
}

export const useOnlineEvalWorkflow = (workflowId: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.onlineEvals.detail(workflowId),
    queryFn: async (): Promise<OnlineEvalWorkflowListItem> => {
      const workflow = await services.http!.get<WorkflowDetail>(getWorkflowUrl(workflowId), {
        version: WORKFLOWS_API_VERSION,
      });

      return {
        id: workflow.id,
        name: workflow.name,
        enabled: workflow.enabled,
        yaml: workflow.yaml,
        parsedConfig: parseOnlineEvalWorkflowYaml(workflow.yaml),
      };
    },
    enabled: workflowId.length > 0,
  });
};

export const useOnlineEvalWorkflows = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.onlineEvals.list(),
    queryFn: async (): Promise<OnlineEvalWorkflowsListResponse> => {
      const listResponse = await services.http!.get<WorkflowListResponse>(WORKFLOWS_API_BASE_URL, {
        query: {
          tags: ONLINE_EVAL_WORKFLOW_TAG,
        },
        version: WORKFLOWS_API_VERSION,
      });

      const workflowIdsMissingYaml = listResponse.results
        .filter(({ yaml }) => yaml === undefined)
        .map(({ id }) => id);

      const workflowSources =
        workflowIdsMissingYaml.length > 0
          ? await services.http!.post<WorkflowYamlSource[]>(`${WORKFLOWS_API_BASE_URL}/mget`, {
              body: JSON.stringify({ ids: workflowIdsMissingYaml, source: ['yaml'] }),
              version: WORKFLOWS_API_VERSION,
            })
          : [];

      const yamlByWorkflowId = new Map(workflowSources.map(({ id, yaml }) => [id, yaml]));

      const workflows = listResponse.results.map((workflow) => {
        const yaml = workflow.yaml ?? yamlByWorkflowId.get(workflow.id);
        if (yaml === undefined) {
          throw new Error(`Unable to load workflow YAML for ${workflow.id}`);
        }

        return {
          id: workflow.id,
          name: workflow.name,
          enabled: workflow.enabled,
          yaml,
          parsedConfig: parseOnlineEvalWorkflowYaml(yaml),
        };
      });

      return {
        page: listResponse.page,
        size: listResponse.size,
        total: listResponse.total,
        workflows,
      };
    },
  });
};

export const useCreateOnlineEvalWorkflow = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ yaml }: { yaml: string }) => {
      return services.http!.post<WorkflowDetail>(`${WORKFLOWS_API_BASE_URL}/workflow`, {
        body: JSON.stringify({ yaml }),
        version: WORKFLOWS_API_VERSION,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.onlineEvals.all });
    },
  });
};

export const useUpdateOnlineEvalWorkflow = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      config,
    }: {
      workflowId: string;
      config: OnlineEvalWorkflowConfig;
    }) => {
      const workflow = await services.http!.get<WorkflowDetail>(getWorkflowUrl(workflowId), {
        version: WORKFLOWS_API_VERSION,
      });

      const body: UpdateWorkflowPayload = {
        name: workflow.name,
        description: workflow.description,
        enabled: workflow.enabled,
        tags: workflow.tags,
        yaml: buildOnlineEvalWorkflowYaml(config),
      };

      return services.http!.put(getWorkflowUrl(workflowId), {
        body: JSON.stringify(body),
        version: WORKFLOWS_API_VERSION,
      });
    },
    onSuccess: async (_, { workflowId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.onlineEvals.list() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.onlineEvals.detail(workflowId) }),
      ]);
    },
  });
};

export const useToggleOnlineEvalWorkflow = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workflowId, enabled }: { workflowId: string; enabled: boolean }) => {
      const workflow = await services.http!.get<WorkflowDetail>(getWorkflowUrl(workflowId), {
        version: WORKFLOWS_API_VERSION,
      });

      const parsedYaml = parseYamlToJSONWithoutValidation(workflow.yaml);
      if (!parsedYaml.success || !parsedYaml.json || typeof parsedYaml.json !== 'object') {
        throw new Error(`Unable to parse workflow YAML for ${workflowId}`);
      }

      const updatedYaml = stringifyWorkflowDefinition({
        ...(parsedYaml.json as Record<string, unknown>),
        enabled,
      });

      const body: UpdateWorkflowPayload = {
        name: workflow.name,
        description: workflow.description,
        enabled,
        tags: workflow.tags,
        yaml: updatedYaml,
      };

      return services.http!.put(getWorkflowUrl(workflowId), {
        body: JSON.stringify(body),
        version: WORKFLOWS_API_VERSION,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.onlineEvals.all });
    },
  });
};

export const useDeleteOnlineEvalWorkflow = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workflowId }: { workflowId: string }) => {
      return services.http!.delete(getWorkflowUrl(workflowId), {
        version: WORKFLOWS_API_VERSION,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.onlineEvals.all });
    },
  });
};
