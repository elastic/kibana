/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/server';
import type { UserProfileService } from '../../services';
import type { CasesWorkflowRunService } from '../../workflows/execution/service';
import type { CasesWorkflowRunContext } from '../../client/workflows/operations';
import { getConnectorsRoute } from './internal/get_connectors';
import { getCaseUserActionStatsRoute } from './internal/get_case_user_actions_stats';
import { bulkCreateAttachmentsRoute } from './internal/bulk_create_attachments';
import { bulkGetCasesRoute } from './internal/bulk_get_cases';
import { countAttachmentsByTypeRoute } from './internal/count_attachments_by_type';
import { suggestUserProfilesRoute } from './internal/suggest_user_profiles';
import type { CaseRoute } from './types';
import { bulkGetAttachmentsRoute } from './internal/bulk_get_attachments';
import { bulkDeleteAttachmentsRoute } from './internal/bulk_delete_attachments';
import { getCaseFilesRoute } from './internal/get_case_files';
import { getCaseUsersRoute } from './internal/get_case_users';
import { bulkDeleteFileAttachments } from './internal/bulk_delete_file_attachments';
import { getCategoriesRoute } from './cases/categories/get_categories';
import { getCaseMetricRoute } from './internal/get_case_metrics';
import { getCasesMetricRoute } from './internal/get_cases_metrics';
import { searchCasesRoute } from './internal/search_cases';
import { replaceCustomFieldRoute } from './internal/replace_custom_field';
import { postObservableRoute } from './observables/post_observable';
import { similarCaseRoute } from './cases/similar';
import { patchObservableRoute } from './observables/patch_observable';
import { bulkDeleteObservablesRoute } from './observables/bulk_delete_observables';
import { deleteObservableRoute } from './observables/delete_observable';
import { findUserActionsRoute } from './internal/find_user_actions';
import { findCasesContainingAllDocumentsRoute } from './internal/find_cases_containing_all_documents';
import type { ConfigType } from '../../config';
import { getTemplateRoutes } from './templates';
import { getFieldDefinitionRoutes } from './field_definitions';
import { createRunWorkflowRoute } from './internal/run_workflow';
import { getTaskRoutes } from './tasks';
import { getTaskTemplateRoutes } from './task_templates';
import { createBulkGetAgentBuilderConversationsRoute } from './internal/bulk_get_agent_builder_conversations';
import { getAgenticCaseRoutes } from './internal/agentic';
import type { ActionSource } from '../../../common/types/domain';
import type { CasesClient } from '../../client';

export const getInternalRoutes = (
  userProfileService: UserProfileService,
  config: ConfigType,
  workflowRun?: {
    service: CasesWorkflowRunService;
    getSpaceId: (request: KibanaRequest) => string;
    getWorkflowRunContext: (request: KibanaRequest) => Promise<CasesWorkflowRunContext>;
  },
  getAgentBuilder?: () => Promise<AgentBuilderPluginStart>,
  getCasesClientAs?: (request: KibanaRequest, actionSource: ActionSource) => Promise<CasesClient>
) =>
  [
    bulkCreateAttachmentsRoute,
    suggestUserProfilesRoute(userProfileService),
    getConnectorsRoute,
    bulkGetCasesRoute,
    // Counts linked attachments for the cases list's agentic columns (Investigations).
    ...(config.agentic.enabled ? [countAttachmentsByTypeRoute] : []),
    getCaseUserActionStatsRoute,
    bulkGetAttachmentsRoute,
    bulkDeleteAttachmentsRoute,
    getCaseFilesRoute,
    getCaseUsersRoute,
    bulkDeleteFileAttachments,
    getCategoriesRoute,
    getCaseMetricRoute,
    getCasesMetricRoute,
    searchCasesRoute,
    replaceCustomFieldRoute,
    postObservableRoute,
    bulkDeleteObservablesRoute,
    patchObservableRoute,
    deleteObservableRoute,
    similarCaseRoute,
    findUserActionsRoute,
    findCasesContainingAllDocumentsRoute,
    ...getTemplateRoutes(config),
    ...getFieldDefinitionRoutes(config),
    ...(workflowRun ? [createRunWorkflowRoute(workflowRun)] : []),
    ...getTaskRoutes(config),
    ...getTaskTemplateRoutes(config),
    ...(getAgentBuilder ? [createBulkGetAgentBuilderConversationsRoute({ getAgentBuilder })] : []),
    ...getAgenticCaseRoutes(config, getAgentBuilder ? getCasesClientAs : undefined),
  ] as CaseRoute[];
