/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { WebCrawlSchedule, WebCrawlScheduleRequest } from '../../common/types';
import { useWebCrawlerServices } from '../context';
import type { WebCrawlHttpError } from './use_web_crawl';
import { WEB_CRAWLS_QUERY_KEY, getWebCrawlErrorMessage } from './use_web_crawl';

const WORKFLOWS_APP_ID = 'workflows';
const WORKFLOWS_FEATURE_ID = 'workflowsManagement';
const MAX_SCHEDULES = 100;
const SCHEDULES_QUERY_KEY = [...WEB_CRAWLS_QUERY_KEY, 'schedules'];

interface WorkflowSummary {
  id: string;
  name: string;
  enabled: boolean;
}

/**
 * Crawl schedules are workflows: a scheduled trigger and one crawl step. This lists the ones
 * created here and creates new ones, as far as the user's Workflows privileges allow.
 */
export const useWebCrawlSchedules = () => {
  const { application, chrome, http } = useWebCrawlerServices();
  const queryClient = useQueryClient();
  const capabilities = application.capabilities[WORKFLOWS_FEATURE_ID];
  // The workflows app stays registered for unauthorized users, so its nav link alone is not enough.
  const canRead = chrome.navLinks.has(WORKFLOWS_APP_ID) && capabilities?.readWorkflow === true;
  const canCreate = canRead && capabilities?.createWorkflow === true;

  const { data: schedules = [] } = useQuery<WebCrawlSchedule[], WebCrawlHttpError>({
    queryKey: SCHEDULES_QUERY_KEY,
    queryFn: async () => {
      const { WEB_CRAWL_WORKFLOW_TAG, WORKFLOWS_API_VERSION, WORKFLOWS_PATH } = await import(
        '../../common/web_crawl_schedule'
      );
      const { results } = await http.get<{ results: WorkflowSummary[] }>(WORKFLOWS_PATH, {
        query: { tags: WEB_CRAWL_WORKFLOW_TAG, size: MAX_SCHEDULES },
        version: WORKFLOWS_API_VERSION,
      });
      return results.map(({ id, name, enabled }) => ({ workflowId: id, name, enabled }));
    },
    enabled: canRead,
    retry: false,
  });

  const create = useMutation<WorkflowSummary, WebCrawlHttpError, WebCrawlScheduleRequest>({
    mutationFn: async (request) => {
      const { WORKFLOWS_API_VERSION, WORKFLOW_PATH, buildWebCrawlWorkflowYaml } = await import(
        '../../common/web_crawl_schedule'
      );
      return http.post<WorkflowSummary>(WORKFLOW_PATH, {
        body: JSON.stringify({ yaml: buildWebCrawlWorkflowYaml(request) }),
        version: WORKFLOWS_API_VERSION,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCHEDULES_QUERY_KEY }),
  });

  return {
    canRead,
    canCreate,
    schedules,
    createSchedule: create.mutate,
    isCreating: create.isLoading,
    createErrorMessage: getWebCrawlErrorMessage(create.error),
    resetCreate: create.reset,
    getWorkflowUrl: (workflowId: string) =>
      application.getUrlForApp(WORKFLOWS_APP_ID, { path: `/${encodeURIComponent(workflowId)}` }),
  };
};
