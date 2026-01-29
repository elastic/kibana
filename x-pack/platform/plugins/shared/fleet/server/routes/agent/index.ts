/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import type { FleetAuthz } from '../../../common';
import { API_VERSIONS } from '../../../common/constants';
import { getRouteRequiredAuthz, type FleetAuthzRouter } from '../../services/security';
import { parseExperimentalConfigValue } from '../../../common/experimental_features';

import { AGENT_API_ROUTES } from '../../constants';
import {
  GetAgentsRequestSchema,
  GetTagsRequestSchema,
  GetOneAgentRequestSchema,
  UpdateAgentRequestSchema,
  MigrateSingleAgentRequestSchema,
  BulkMigrateAgentsRequestSchema,
  DeleteAgentRequestSchema,
  PostAgentUnenrollRequestSchema,
  PostBulkAgentUnenrollRequestSchema,
  GetAgentStatusRequestSchema,
  GetAgentDataRequestSchema,
  PostNewAgentActionRequestSchema,
  PostAgentReassignRequestSchema,
  PostBulkAgentReassignRequestSchema,
  PostAgentUpgradeRequestSchema,
  PostBulkAgentUpgradeRequestSchema,
  GetActionStatusRequestSchema,
  PostRequestDiagnosticsActionRequestSchema,
  PostBulkRequestDiagnosticsActionRequestSchema,
  ListAgentUploadsRequestSchema,
  GetAgentUploadFileRequestSchema,
  PostRetrieveAgentsByActionsRequestSchema,
  DeleteAgentUploadFileRequestSchema,
  GetTagsResponseSchema,
  MigrateSingleAgentResponseSchema,
  BulkMigrateAgentsResponseSchema,
} from '../../types';
import * as AgentService from '../../services/agents';
import type { FleetConfigType } from '../..';

import {
  BulkChangeAgentsPrivilegeLevelRequestSchema,
  BulkChangeAgentsPrivilegeLevelResponseSchema,
  ChangeAgentPrivilegeLevelRequestSchema,
  ChangeAgentPrivilegeLevelResponseSchema,
  DeleteAgentResponseSchema,
  DeleteAgentUploadFileResponseSchema,
  GetActionStatusResponseSchema,
  GetAgentDataResponseSchema,
  GetAgentResponseSchema,
  GetAgentStatusResponseSchema,
  GetAgentsResponseSchema,
  GetAvailableAgentVersionsResponseSchema,
  ListAgentUploadsResponseSchema,
  PostAgentRollbackRequestSchema,
  PostAgentRollbackResponseSchema,
  PostBulkActionResponseSchema,
  PostBulkAgentRollbackRequestSchema,
  PostBulkAgentRollbackResponseSchema,
  PostBulkUpdateAgentTagsRequestSchema,
  PostCancelActionRequestSchema,
  PostNewAgentActionResponseSchema,
  PostRetrieveAgentsByActionsResponseSchema,
} from '../../types/rest_spec/agent';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';
import { calculateRouteAuthz } from '../../services/security/security';

import { genericErrorResponse } from '../schema/errors';

import {
  getAgentsHandler,
  getAgentTagsHandler,
  getAgentHandler,
  updateAgentHandler,
  deleteAgentHandler,
  getAgentStatusForAgentPolicyHandler,
  postBulkAgentReassignHandler,
  getAgentDataHandler,
  bulkUpdateAgentTagsHandler,
  getAvailableVersionsHandler,
  getActionStatusHandler,
  getAgentUploadsHandler,
  getAgentUploadFileHandler,
  deleteAgentUploadFileHandler,
  postAgentReassignHandler,
  postRetrieveAgentsByActionsHandler,
  getAgentStatusRuntimeFieldHandler,
} from './handlers';
import {
  postNewAgentActionHandlerBuilder,
  postCancelActionHandlerBuilder,
} from './actions_handlers';
import { postAgentUnenrollHandler, postBulkAgentsUnenrollHandler } from './unenroll_handler';
import { postAgentUpgradeHandler, postBulkAgentsUpgradeHandler } from './upgrade_handler';
import {
  bulkRequestDiagnosticsHandler,
  requestDiagnosticsHandler,
} from './request_diagnostics_handler';
import { bulkMigrateAgentsHandler, migrateSingleAgentHandler } from './migrate_handlers';
import {
  bulkChangeAgentsPrivilegeLevelHandler,
  changeAgentPrivilegeLevelHandler,
} from './change_privilege_level_handlers';
import { bulkRollbackAgentHandler, rollbackAgentHandler } from './rollback_handlers';

export const registerAPIRoutes = (router: FleetAuthzRouter, config: FleetConfigType) => {
  const experimentalFeatures = parseExperimentalConfigValue(
    config.enableExperimental || [],
    config.experimentalFeatures || {}
  );
  // Get one
  router.versioned
    .get({
      path: AGENT_API_ROUTES.INFO_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.READ],
        },
      },
      summary: `Get an agent`,
      description: `Get an agent by ID.`,
      options: {
        tags: ['oas-tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetOneAgentRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetAgentResponseSchema,
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      getAgentHandler
    );

  // Migrate
  // Single agent migration
  router.versioned
    .post({
      path: AGENT_API_ROUTES.MIGRATE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: `Migrate a single agent`,
      description: `Migrate a single agent to another cluster.`,
      options: {
        tags: ['oas-tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: MigrateSingleAgentRequestSchema,
          response: {
            200: {
              body: () => MigrateSingleAgentResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },

      migrateSingleAgentHandler
    );

  // Bulk migrate multiple agents
  router.versioned
    .post({
      path: AGENT_API_ROUTES.BULK_MIGRATE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: `Migrate multiple agents`,
      description: `Bulk migrate agents to another cluster.`,
      options: {
        tags: ['oas-tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: BulkMigrateAgentsRequestSchema,
          response: {
            200: {
              body: () => BulkMigrateAgentsResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      bulkMigrateAgentsHandler
    );

  // Update
  router.versioned
    .put({
      path: AGENT_API_ROUTES.UPDATE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: `Update an agent by ID`,
      description: `Update an agent by ID.`,
      options: {
        tags: ['oas-tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: UpdateAgentRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetAgentResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      updateAgentHandler
    );

  // Bulk Update Tags
  router.versioned
    .post({
      path: AGENT_API_ROUTES.BULK_UPDATE_AGENT_TAGS_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: `Bulk update agent tags`,
      options: {
        tags: ['oas-tag:Elastic Agent actions'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostBulkUpdateAgentTagsRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => PostBulkActionResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      bulkUpdateAgentTagsHandler
    );

  // Delete
  router.versioned
    .delete({
      path: AGENT_API_ROUTES.DELETE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: `Delete an agent`,
      description: `Delete an agent by ID.`,
      options: {
        tags: ['oas-tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DeleteAgentRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => DeleteAgentResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      deleteAgentHandler
    );

  // List
  router.versioned
    .get({
      path: AGENT_API_ROUTES.LIST_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.READ],
        },
      },
      summary: `Get agents`,
      options: {
        tags: ['oas-tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetAgentsRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetAgentsResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getAgentsHandler
    );

  // List Agent Tags
  router.versioned
    .get({
      path: AGENT_API_ROUTES.LIST_TAGS_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.READ],
        },
      },
      summary: `Get agent tags`,
      options: {
        tags: ['oas-tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetTagsRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetTagsResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getAgentTagsHandler
    );

  // Agent actions
  router.versioned
    .post({
      path: AGENT_API_ROUTES.ACTIONS_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: `Create an agent action`,
      options: {
        tags: ['oas-tag:Elastic Agent actions'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostNewAgentActionRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => PostNewAgentActionResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      postNewAgentActionHandlerBuilder({
        getAgent: AgentService.getAgentById,
        cancelAgentAction: AgentService.cancelAgentAction,
        createAgentAction: AgentService.createAgentAction,
        getAgentActions: AgentService.getAgentActions,
      })
    );

  router.versioned
    .post({
      path: AGENT_API_ROUTES.CANCEL_ACTIONS_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: `Cancel an agent action`,
      options: {
        tags: ['oas-tag:Elastic Agent actions'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostCancelActionRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => PostNewAgentActionResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      postCancelActionHandlerBuilder({
        getAgent: AgentService.getAgentById,
        cancelAgentAction: AgentService.cancelAgentAction,
        createAgentAction: AgentService.createAgentAction,
        getAgentActions: AgentService.getAgentActions,
      })
    );

  // Get agents by Action_Ids
  router.versioned
    .post({
      path: AGENT_API_ROUTES.LIST_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.READ],
        },
      },
      summary: `Get agents by action ids`,
      options: {
        tags: ['oas-tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostRetrieveAgentsByActionsRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => PostRetrieveAgentsByActionsResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      postRetrieveAgentsByActionsHandler
    );

  router.versioned
    .post({
      path: AGENT_API_ROUTES.UNENROLL_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: `Unenroll an agent`,
      options: {
        tags: ['oas-tag:Elastic Agent actions'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostAgentUnenrollRequestSchema, response: {} },
      },
      postAgentUnenrollHandler
    );

  router.versioned
    .post({
      path: AGENT_API_ROUTES.REASSIGN_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: `Reassign an agent`,
      options: {
        tags: ['oas-tag:Elastic Agent actions'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostAgentReassignRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => schema.object({}),
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      postAgentReassignHandler
    );

  router.versioned
    .post({
      path: AGENT_API_ROUTES.REQUEST_DIAGNOSTICS_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.READ],
        },
      },
      summary: `Request agent diagnostics`,
      options: {
        tags: ['oas-tag:Elastic Agent actions'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostRequestDiagnosticsActionRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => PostBulkActionResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      requestDiagnosticsHandler
    );

  router.versioned
    .post({
      path: AGENT_API_ROUTES.BULK_REQUEST_DIAGNOSTICS_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.READ],
        },
      },
      summary: `Bulk request diagnostics from agents`,
      options: {
        tags: ['oas-tag:Elastic Agent actions'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostBulkRequestDiagnosticsActionRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => PostBulkActionResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      bulkRequestDiagnosticsHandler
    );

  router.versioned
    .get({
      path: AGENT_API_ROUTES.LIST_UPLOADS_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.READ],
        },
      },
      summary: `Get agent uploads`,
      options: {
        tags: ['oas-tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: ListAgentUploadsRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => ListAgentUploadsResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getAgentUploadsHandler
    );

  router.versioned
    .get({
      path: AGENT_API_ROUTES.GET_UPLOAD_FILE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.READ],
        },
      },
      summary: `Get an uploaded file`,
      description: `Get a file uploaded by an agent.`,
      options: {
        tags: ['oas-tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetAgentUploadFileRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => schema.stream(), // Readable
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getAgentUploadFileHandler
    );

  router.versioned
    .delete({
      path: AGENT_API_ROUTES.DELETE_UPLOAD_FILE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: `Delete an uploaded file`,
      description: `Delete a file uploaded by an agent.`,
      options: {
        tags: ['oas-tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DeleteAgentUploadFileRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => DeleteAgentUploadFileResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      deleteAgentUploadFileHandler
    );
  // Get agent status for policy
  router.versioned
    // @ts-ignore  https://github.com/elastic/kibana/issues/203170
    .get({
      path: AGENT_API_ROUTES.STATUS_PATTERN,
      // TODO move to kibana authz https://github.com/elastic/kibana/issues/203170
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        calculateRouteAuthz(
          fleetAuthz,
          getRouteRequiredAuthz('get', AGENT_API_ROUTES.STATUS_PATTERN)
        ).granted,
      summary: `Get an agent status summary`,
      options: {
        tags: ['oas-tag:Elastic Agent status'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetAgentStatusRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetAgentStatusResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getAgentStatusForAgentPolicyHandler
    );
  // Agent data
  router.versioned
    .get({
      path: AGENT_API_ROUTES.DATA_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.READ],
        },
      },
      summary: `Get incoming agent data`,
      options: {
        tags: ['oas-tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetAgentDataRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetAgentDataResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getAgentDataHandler
    );

  // upgrade agent
  router.versioned
    .post({
      path: AGENT_API_ROUTES.UPGRADE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: `Upgrade an agent`,
      options: {
        tags: ['oas-tag:Elastic Agent actions'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostAgentUpgradeRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => schema.object({}),
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      postAgentUpgradeHandler
    );
  // bulk upgrade
  router.versioned
    .post({
      path: AGENT_API_ROUTES.BULK_UPGRADE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: `Bulk upgrade agents`,
      options: {
        tags: ['oas-tag:Elastic Agent actions'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostBulkAgentUpgradeRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => PostBulkActionResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      postBulkAgentsUpgradeHandler
    );

  // Current actions
  router.versioned
    .get({
      path: AGENT_API_ROUTES.ACTION_STATUS_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.READ],
        },
      },
      summary: `Get an agent action status`,
      options: {
        tags: ['oas-tag:Elastic Agent actions'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetActionStatusRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetActionStatusResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getActionStatusHandler
    );

  // Bulk reassign
  router.versioned
    .post({
      path: AGENT_API_ROUTES.BULK_REASSIGN_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: `Bulk reassign agents`,
      options: {
        tags: ['oas-tag:Elastic Agent actions'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostBulkAgentReassignRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => PostBulkActionResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      postBulkAgentReassignHandler
    );

  // Bulk unenroll
  router.versioned
    .post({
      path: AGENT_API_ROUTES.BULK_UNENROLL_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: `Bulk unenroll agents`,
      options: {
        tags: ['oas-tag:Elastic Agent actions'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostBulkAgentUnenrollRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => PostBulkActionResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      postBulkAgentsUnenrollHandler
    );

  // Available versions for upgrades
  router.versioned
    .get({
      path: AGENT_API_ROUTES.AVAILABLE_VERSIONS_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.READ],
        },
      },
      summary: `Get available agent versions`,
      options: {
        tags: ['oas-tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {},
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetAvailableAgentVersionsResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getAvailableVersionsHandler
    );

  // route used by export CSV feature on the UI to generate report
  router.versioned
    .get({
      path: '/internal/fleet/agents/status_runtime_field',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.READ],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {},
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => schema.string(),
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getAgentStatusRuntimeFieldHandler
    );

  // Change agent privilege level
  if (experimentalFeatures.enableAgentPrivilegeLevelChange) {
    router.versioned
      .post({
        path: AGENT_API_ROUTES.PRIVILEGE_LEVEL_CHANGE_PATTERN,
        security: {
          authz: {
            requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
          },
        },
        summary: `Change agent privilege level`,
        description: `Change the privilege level of a single agent to unprivileged.`,
        options: {
          tags: ['oas-tag:Elastic Agents'],
          availability: {
            since: '9.3.0',
            stability: 'experimental',
          },
        },
      })
      .addVersion(
        {
          version: API_VERSIONS.public.v1,
          validate: {
            request: ChangeAgentPrivilegeLevelRequestSchema,
            response: {
              200: {
                description: 'OK: A successful request.',
                body: () => ChangeAgentPrivilegeLevelResponseSchema,
              },
              400: {
                description: 'A bad request.',
                body: genericErrorResponse,
              },
            },
          },
          options: {
            oasOperationObject: () => ({
              requestBody: {
                content: {
                  'application/json': {
                    examples: {
                      changeAgentPrivilegeLevelRequest: {
                        value: {
                          user_info: {
                            username: 'username',
                            groupname: 'groupname',
                            password: 'password',
                          },
                        },
                      },
                    },
                  },
                },
              },
              responses: {
                200: {
                  content: {
                    'application/json': {
                      examples: {
                        successResponse: {
                          value: {
                            actionId: 'actionId',
                          },
                        },
                      },
                    },
                  },
                },
                400: {
                  content: {
                    'application/json': {
                      examples: {
                        badRequestResponse: {
                          value: {
                            message: 'Bad Request',
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          },
        },

        changeAgentPrivilegeLevelHandler
      );

    router.versioned
      .post({
        path: AGENT_API_ROUTES.BULK_PRIVILEGE_LEVEL_CHANGE_PATTERN,
        security: {
          authz: {
            requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
          },
        },
        summary: `Bulk change agent privilege level`,
        description: `Change multiple agents' privilege level to unprivileged.`,
        options: {
          tags: ['oas-tag:Elastic Agents'],
          availability: {
            since: '9.3.0',
            stability: 'experimental',
          },
        },
      })
      .addVersion(
        {
          version: API_VERSIONS.public.v1,
          validate: {
            request: BulkChangeAgentsPrivilegeLevelRequestSchema,
            response: {
              200: {
                description: 'OK: A successful request.',
                body: () => BulkChangeAgentsPrivilegeLevelResponseSchema,
              },
              400: {
                description: 'A bad request.',
                body: genericErrorResponse,
              },
            },
          },
          options: {
            oasOperationObject: () => ({
              requestBody: {
                content: {
                  'application/json': {
                    examples: {
                      bulkChangeAgentPrivilegeLevelRequest: {
                        value: {
                          agents: 'agent',
                          user_info: {
                            username: 'username',
                            groupname: 'groupname',
                            password: 'password',
                          },
                        },
                      },
                    },
                  },
                },
              },
              responses: {
                200: {
                  content: {
                    'application/json': {
                      examples: {
                        successResponse: {
                          value: {
                            actionId: 'actionId',
                          },
                        },
                      },
                    },
                  },
                },
                400: {
                  content: {
                    'application/json': {
                      examples: {
                        badRequestResponse: {
                          value: {
                            message: 'Bad Request',
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          },
        },

        bulkChangeAgentsPrivilegeLevelHandler
      );
  }

  // Upgrade rollback
  if (experimentalFeatures.enableAgentRollback) {
    router.versioned
      .post({
        path: AGENT_API_ROUTES.ROLLBACK_PATTERN,
        security: {
          authz: {
            requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
          },
        },
        summary: `Rollback an agent`,
        description: `Rollback an agent to the previous version.`,
        options: {
          tags: ['oas-tag:Elastic Agent actions'],
          availability: {
            since: '9.4.0',
            stability: 'experimental',
          },
        },
      })
      .addVersion(
        {
          version: API_VERSIONS.public.v1,
          validate: {
            request: PostAgentRollbackRequestSchema,
            response: {
              200: {
                description: 'OK: A successful request.',
                body: () => PostAgentRollbackResponseSchema,
              },
              400: {
                description: 'A bad request.',
                body: genericErrorResponse,
              },
            },
          },
          options: {
            oasOperationObject: () => ({
              responses: {
                200: {
                  content: {
                    'application/json': {
                      examples: {
                        successResponse: {
                          value: {
                            actionId: 'actionId',
                          },
                        },
                      },
                    },
                  },
                },
                400: {
                  content: {
                    'application/json': {
                      examples: {
                        badRequestResponse: {
                          value: {
                            message: 'Bad Request',
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          },
        },
        rollbackAgentHandler
      );

    router.versioned
      .post({
        path: AGENT_API_ROUTES.BULK_ROLLBACK_PATTERN,
        security: {
          authz: {
            requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
          },
        },
        summary: `Bulk rollback agents`,
        description: `Rollback multiple agents to the previous version.`,
        options: {
          tags: ['oas-tag:Elastic Agent actions'],
          availability: {
            since: '9.4.0',
            stability: 'experimental',
          },
        },
      })
      .addVersion(
        {
          version: API_VERSIONS.public.v1,
          validate: {
            request: PostBulkAgentRollbackRequestSchema,
            response: {
              200: {
                description: 'OK: A successful request.',
                body: () => PostBulkAgentRollbackResponseSchema,
              },
              400: {
                description: 'A bad request.',
                body: genericErrorResponse,
              },
            },
          },
          options: {
            oasOperationObject: () => ({
              requestBody: {
                content: {
                  'application/json': {
                    examples: {
                      bulkRollbackAgentsRequest: {
                        value: {
                          agents: ['agent-1', 'agent-2'],
                          batchSize: 100,
                          includeInactive: false,
                        },
                      },
                    },
                  },
                },
              },
              responses: {
                200: {
                  content: {
                    'application/json': {
                      examples: {
                        successResponse: {
                          value: {
                            actionIds: ['actionId1', 'actionId2'],
                          },
                        },
                      },
                    },
                  },
                },
                400: {
                  content: {
                    'application/json': {
                      examples: {
                        badRequestResponse: {
                          value: {
                            message: 'Bad Request',
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          },
        },
        bulkRollbackAgentHandler
      );
  }
};
