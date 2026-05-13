/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { PLUGIN_ID } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getUserInfo } from '../../lib/get_user_info';

export const getWorkflowRequest = (context: StepHandlerContext): KibanaRequest =>
  context.contextManager.getFakeRequest();

// Uses API privilege tags (not UI capabilities) so the check works for Task Manager
// fakeRequests, which don't carry UI-level capability resolution.
export const requireOsqueryWriteAuthz = async (
  osqueryContext: OsqueryAppContext,
  request: KibanaRequest,
  actionParams: { saved_query_id?: string; pack_id?: string }
): Promise<void> => {
  const { authz } = osqueryContext.security;

  if (!authz.mode.useRbacForRequest(request)) {
    return;
  }

  const checkPrivileges = authz.checkPrivilegesDynamicallyWithRequest(request);

  const hasSavedQueryOrPack = !!(actionParams.saved_query_id || actionParams.pack_id);
  const { privileges } = await checkPrivileges({
    kibana: [
      authz.actions.api.get(`${PLUGIN_ID}-writeLiveQueries`),
      ...(hasSavedQueryOrPack ? [authz.actions.api.get(`${PLUGIN_ID}-runSavedQueries`)] : []),
    ],
  });

  const hasWriteLiveQueries = privileges.kibana.some(
    (p) => p.privilege === authz.actions.api.get(`${PLUGIN_ID}-writeLiveQueries`) && p.authorized
  );
  const hasRunSavedQueries =
    hasSavedQueryOrPack &&
    privileges.kibana.some(
      (p) => p.privilege === authz.actions.api.get(`${PLUGIN_ID}-runSavedQueries`) && p.authorized
    );

  if (!hasWriteLiveQueries && !hasRunSavedQueries) {
    throw new ExecutionError({
      type: 'PermissionError',
      message: 'User is not authorized to run osquery live queries or saved queries.',
    });
  }
};

export const requireOsqueryReadAuthz = async (
  osqueryContext: OsqueryAppContext,
  request: KibanaRequest
): Promise<void> => {
  const { authz } = osqueryContext.security;

  if (!authz.mode.useRbacForRequest(request)) {
    return;
  }

  const checkPrivileges = authz.checkPrivilegesDynamicallyWithRequest(request);
  const { hasAllRequested } = await checkPrivileges({
    kibana: [authz.actions.api.get(`${PLUGIN_ID}-readLiveQueries`)],
  });

  if (!hasAllRequested) {
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
