/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { createForbiddenError } from '@kbn/agent-builder-common';
import type { ConversationMetadataAuthorizer } from '@kbn/agent-builder-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import {
  ESCALATION_ASSIGNEES_FIELD,
  ESCALATION_LINKED_INVESTIGATIONS_FIELD,
  ESCALATION_STATUS_FIELD,
  ESCALATION_TEMPLATE_ID,
  INVESTIGATION_TEMPLATE_ID,
} from '../common/escalations/constants';
import { ESCALATIONS_API_PRIVILEGE_MANAGE } from './escalations/constants';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from './investigations/constants';

const CLOSE_REASON_FIELD = 'close_reason';

/**
 * Privileges a field write requires, all of them. Escalation status matches the status route:
 * manage escalations and manage investigations. Other fields match the flyout that edits them.
 */
const FIELD_PRIVILEGES: Record<string, Record<string, readonly string[]>> = {
  [ESCALATION_TEMPLATE_ID]: {
    [ESCALATION_STATUS_FIELD]: [
      ESCALATIONS_API_PRIVILEGE_MANAGE,
      INVESTIGATIONS_API_PRIVILEGE_MANAGE,
    ],
    [CLOSE_REASON_FIELD]: [ESCALATIONS_API_PRIVILEGE_MANAGE, INVESTIGATIONS_API_PRIVILEGE_MANAGE],
    [ESCALATION_ASSIGNEES_FIELD]: [ESCALATIONS_API_PRIVILEGE_MANAGE],
    [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: [ESCALATIONS_API_PRIVILEGE_MANAGE],
  },
  [INVESTIGATION_TEMPLATE_ID]: {
    status: [INVESTIGATIONS_API_PRIVILEGE_MANAGE],
    [CLOSE_REASON_FIELD]: [INVESTIGATIONS_API_PRIVILEGE_MANAGE],
    assignees: [INVESTIGATIONS_API_PRIVILEGE_MANAGE],
  },
};

export interface ConversationMetadataAuthorizerDeps {
  getSecurity: () => Promise<SecurityPluginStart | undefined>;
  logger: Logger;
  /** `xpack.agenticInvestigations.escalations.enabled`. */
  escalationsEnabled: boolean;
}

const denialMessage = (fields: readonly string[]): string =>
  `The user is not allowed to change ${fields.join(', ')}.`;

/**
 * Gates escalation and investigation metadata writes that the status routes and flyout already
 * restrict. Other templates and ungated fields stay writable with converse access.
 */
export const createConversationMetadataAuthorizer = ({
  getSecurity,
  logger,
  escalationsEnabled,
}: ConversationMetadataAuthorizerDeps): ConversationMetadataAuthorizer => {
  const deniedFields = async (
    request: KibanaRequest,
    templateId: string,
    fieldNames: readonly string[]
  ): Promise<string[]> => {
    const policy = FIELD_PRIVILEGES[templateId];
    if (!policy) {
      return [];
    }
    const gated = fieldNames.filter((name) => policy[name] !== undefined);
    if (gated.length === 0) {
      return [];
    }

    // Escalations are not served when the feature is off, so their manage privilege is not held
    // even when another feature grants the API name.
    if (templateId === ESCALATION_TEMPLATE_ID && !escalationsEnabled) {
      return gated;
    }

    const security = await getSecurity();
    if (!security) {
      logger.warn(
        'Security is unavailable, so the conversation metadata privilege check fails closed'
      );
      return gated;
    }

    const requiredPrivileges = [...new Set(gated.flatMap((name) => policy[name] ?? []))];
    const toAction = (privilege: string) => security.authz.actions.api.get(privilege);
    const response = await security.authz.checkPrivilegesDynamicallyWithRequest(request)({
      kibana: requiredPrivileges.map(toAction),
    });
    const held = new Set(
      (response.privileges?.kibana ?? [])
        .filter(({ authorized }) => authorized)
        .map(({ privilege }) => privilege)
    );
    return gated.filter((name) => {
      const required = policy[name];
      return (
        required !== undefined && !required.every((privilege) => held.has(toAction(privilege)))
      );
    });
  };

  return {
    authorize: async (request, { templateId, updates }) => {
      const denied = await deniedFields(request, templateId, Object.keys(updates));
      if (denied.length > 0) {
        throw createForbiddenError(denialMessage(denied));
      }
    },
  };
};
