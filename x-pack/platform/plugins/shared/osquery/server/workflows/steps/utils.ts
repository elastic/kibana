/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { isOsqueryResponseActionAuthorized } from '../../lib/check_response_action_authz';
import { getUserInfo } from '../../lib/get_user_info';

export const getWorkflowRequest = (context: StepHandlerContext): KibanaRequest =>
  context.contextManager.getFakeRequest();

export const requireOsqueryWriteAuthz = async (
  coreStart: CoreStart,
  request: KibanaRequest,
  actionParams: { saved_query_id?: string; pack_id?: string }
): Promise<void> => {
  const authorized = await isOsqueryResponseActionAuthorized(coreStart, request, actionParams);

  if (!authorized) {
    throw new ExecutionError({
      type: 'PermissionError',
      message: 'User is not authorized to run osquery live queries or saved queries.',
    });
  }
};

export const requireOsqueryReadAuthz = async (
  coreStart: CoreStart,
  request: KibanaRequest
): Promise<void> => {
  const resolved = await coreStart.capabilities.resolveCapabilities(request, {
    capabilityPath: 'osquery.*',
  });

  if (!resolved.osquery?.readLiveQueries) {
    throw new ExecutionError({
      type: 'PermissionError',
      message: 'User is not authorized to read osquery live query results.',
    });
  }
};

interface WorkflowUserMetadata {
  currentUser: string | undefined;
  userProfileUid: string | null | undefined;
}

export const getWorkflowUserMetadata = async (
  request: KibanaRequest,
  osqueryContext: OsqueryAppContext
): Promise<WorkflowUserMetadata> => {
  const userInfo = await getUserInfo({
    request,
    security: osqueryContext.security,
    logger: osqueryContext.logFactory.get('osquery.workflows'),
  });

  return {
    currentUser: userInfo?.username ?? undefined,
    userProfileUid: userInfo?.profile_uid ?? undefined,
  };
};
