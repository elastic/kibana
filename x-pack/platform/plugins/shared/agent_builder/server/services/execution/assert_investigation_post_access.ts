/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { ApiPrivileges } from '@kbn/core-security-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { i18n } from '@kbn/i18n';
import { createForbiddenError } from '@kbn/agent-builder-common';

/** Same id the investigations template registers. Kept local to avoid a plugin dependency. */
export const INVESTIGATION_TEMPLATE_ID = 'investigation';

const MANAGE_INVESTIGATIONS_API_PRIVILEGE = ApiPrivileges.manage('investigations');

/**
 * Rejects a chat post into an investigation when the caller cannot change investigations.
 * Security disabled (no plugin) leaves the existing chat authorization in place.
 */
export const assertCanChangeInvestigation = async ({
  request,
  spaceId,
  security,
}: {
  request: KibanaRequest;
  spaceId: string;
  security: SecurityPluginStart | undefined;
}): Promise<void> => {
  if (!security) {
    return;
  }

  const { hasAllRequested } = await security.authz
    .checkPrivilegesWithRequest(request)
    .atSpace(spaceId, {
      kibana: [security.authz.actions.api.get(MANAGE_INVESTIGATIONS_API_PRIVILEGE)],
    });

  if (!hasAllRequested) {
    throw createForbiddenError(
      i18n.translate('xpack.agentBuilder.execution.investigationPostForbiddenErrorMessage', {
        defaultMessage: "You don't have permission to change this investigation.",
      })
    );
  }
};
