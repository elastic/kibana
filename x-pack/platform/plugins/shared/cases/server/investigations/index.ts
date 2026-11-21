/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common';
import type { CasesClient } from '../client';
import type { ConfigType } from '../config';
import type { CasesServerStartDependencies } from '../types';
import type { CaseRoute } from '../routes/api/types';
import type { Actor } from '../../common/investigations/types';
import {
  INVESTIGATION_AGENT_ID,
  INVESTIGATION_CONVERSATION_TEMPLATE_ID,
} from '../../common/investigations/types';
import { INVESTIGATIONS_OWNER } from '../../common/investigations/constants';
import { ensureInvestigationIndices } from './indices';
import { InvestigationsService } from './service';
import type { AlertsClientLike } from './service';
import { getInvestigationRoutes } from './routes';
import type { GetCasesClientFn } from '../client/types';
import { toActionSource } from '../../common/types/domain/user_action/source/v1';

export { InvestigationsService } from './service';

export interface InvestigationsSetup {
  routes: CaseRoute[];
  /** Builds a request-scoped service (used by Agent Builder tools and hooks). */
  getServiceForRequest: (
    request: KibanaRequest,
    opts?: { asAgent?: { id: string; name: string } }
  ) => Promise<InvestigationsService>;
  start: (core: CoreStart) => Promise<void>;
}

/** Wires the investigation indices, service and routes into the Cases plugin. */
export const setupInvestigations = ({
  core,
  config,
  logger,
  getCasesClient,
  getSpaceId,
  agentBuilder,
}: {
  core: CoreSetup<CasesServerStartDependencies>;
  config: ConfigType;
  logger: Logger;
  getCasesClient: GetCasesClientFn;
  getSpaceId: (request?: KibanaRequest) => string;
  agentBuilder?: AgentBuilderPluginSetup;
}): InvestigationsSetup => {
  const log = logger.get('investigations');

  if (agentBuilder) {
    agentBuilder.conversationTemplates.register({
      id: INVESTIGATION_CONVERSATION_TEMPLATE_ID,
      version: 1,
      name: 'Cases investigation',
      description: 'A conversation that belongs to a Cases investigation record.',
      fields: {
        record_id: {
          input_type: 'TEXT',
          description: 'Id of the investigation record this conversation belongs to.',
          max_length: 512,
        },
      },
    });
  }

  const buildService = async (
    request: KibanaRequest,
    casesClient: CasesClient,
    asAgent?: { id: string; name: string }
  ): Promise<InvestigationsService> => {
    const [coreStart, pluginsStart] = await core.getStartServices();
    const user = coreStart.security.authc.getCurrentUser(request);
    const username = user?.username ?? 'unknown';
    const actor: Actor | undefined = asAgent
      ? {
          type: 'agent',
          id: asAgent.id,
          name: asAgent.name,
          on_behalf_of: user?.full_name || username,
        }
      : undefined;
    let availability: Promise<{ available: boolean; reason?: string }> | undefined;
    const isAvailable = () => {
      availability ??= (async () => {
        if (!pluginsStart.agentBuilder) {
          return { available: false, reason: 'Agent Builder is not installed.' };
        }
        const license = await pluginsStart.licensing.getLicense();
        if (!license.isActive || !license.hasAtLeast('enterprise')) {
          return {
            available: false,
            reason: 'Agent Builder needs an Enterprise or trial license.',
          };
        }
        const { authz } = pluginsStart.security;
        if (authz.mode.useRbacForRequest(request)) {
          const check = authz.checkPrivilegesDynamicallyWithRequest(request);
          const { hasAllRequested } = await check({
            kibana: authz.actions.api.get('agentBuilder:read'),
          });
          if (!hasAllRequested) {
            return { available: false, reason: 'You do not have access to Agent Builder.' };
          }
        }
        return { available: true };
      })().catch((error) => {
        log.warn(`Agent Builder availability check failed: ${error}`);
        return { available: false, reason: 'Agent Builder availability could not be checked.' };
      });
      return availability;
    };
    return new InvestigationsService({
      esClient: coreStart.elasticsearch.client.asInternalUser,
      scopedEsClient: coreStart.elasticsearch.client.asScoped(request).asCurrentUser,
      casesClient,
      logger: log,
      spaceId: getSpaceId(request),
      user: {
        username,
        fullName: user?.full_name || username,
        profileUid: user?.profile_uid ?? null,
      },
      allowBackdate: config.investigations.allowBackdate,
      actor,
      canUpdateCases: async () => {
        const { authz } = pluginsStart.security;
        if (!authz.mode.useRbacForRequest(request)) return true;
        const check = authz.checkPrivilegesDynamicallyWithRequest(request);
        const { hasAllRequested } = await check({
          kibana: [authz.actions.cases.get(INVESTIGATIONS_OWNER, 'updateCase')],
        });
        return hasAllRequested;
      },
      getUserProfiles: async (uids) => {
        if (!uids.length) return [];
        const profiles = await pluginsStart.security.userProfiles.bulkGet({ uids: new Set(uids) });
        return profiles.map((profile) => ({
          uid: profile.uid,
          username: profile.user.username,
          fullName: profile.user.full_name || profile.user.username,
        }));
      },
      canManageSettings: async () => {
        const { authz } = pluginsStart.security;
        if (!authz.mode.useRbacForRequest(request)) return true;
        const check = authz.checkPrivilegesDynamicallyWithRequest(request);
        const { hasAllRequested } = await check({
          kibana: [authz.actions.cases.get(INVESTIGATIONS_OWNER, 'updateConfiguration')],
        });
        return hasAllRequested;
      },
      getAlertsClient: async () =>
        (await pluginsStart.ruleRegistry.getRacClientWithRequest(
          request
        )) as unknown as AlertsClientLike,
      agent: {
        isAvailable,
        agentId: INVESTIGATION_AGENT_ID,
        agentName: 'Investigation agent',
        createConversation: pluginsStart.agentBuilder
          ? async ({ title, recordId }) => {
              const client = await pluginsStart.agentBuilder?.conversations.getScopedClient({
                request,
              });
              if (!client) throw new Error('Agent Builder conversations are unavailable');
              const created = await client.create({
                agentId: INVESTIGATION_AGENT_ID,
                title: title.slice(0, 250),
                templateId: INVESTIGATION_CONVERSATION_TEMPLATE_ID,
                metadata: { record_id: recordId },
                accessControl: { access_mode: ConversationAccessControlMode.Public },
              });
              return created.id;
            }
          : undefined,
      },
    });
  };

  const routes = getInvestigationRoutes(async ({ context, request }) => {
    const casesContext = await context.cases;
    return buildService(request, await casesContext.getCasesClient());
  });

  return {
    routes,
    getServiceForRequest: async (request, opts) =>
      buildService(
        request,
        await getCasesClient(
          request,
          opts?.asAgent
            ? {
                actionSource: toActionSource({
                  type: 'agent',
                  id: opts.asAgent.id,
                  name: opts.asAgent.name,
                }),
              }
            : undefined
        ),
        opts?.asAgent
      ),
    start: async (coreStart) => {
      try {
        await ensureInvestigationIndices(coreStart.elasticsearch.client.asInternalUser, log);
      } catch (error) {
        log.error(`Failed to set up the investigation indices: ${error}`);
      }
    },
  };
};
