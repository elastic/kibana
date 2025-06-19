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
  DeleteAgentResponseSchema,
  DeleteAgentUploadFileResponseSchema,
  GetActionStatusResponseSchema,
  GetAgentDataResponseSchema,
  GetAgentResponseSchema,
  GetAgentStatusResponseSchema,
  GetAgentsResponseSchema,
  GetAvailableAgentVersionsResponseSchema,
  ListAgentUploadsResponseSchema,
  PostBulkActionResponseSchema,
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

export const registerAPIRoutes = (router: FleetAuthzRouter, config: FleetConfigType) => {
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
              body: () => GetAgentResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getAgentHandler
    );

  // Migrate
  const experimentalFeatures = parseExperimentalConfigValue(config.enableExperimental);
  if (experimentalFeatures.enableAgentMigrations) {
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
              },
              400: {
                body: genericErrorResponse,
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
              },
              400: {
                body: genericErrorResponse,
              },
            },
          },
        },
        bulkMigrateAgentsHandler
      );
  }
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
              body: () => GetAgentResponseSchema,
            },
            400: {
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
              body: () => PostBulkActionResponseSchema,
            },
            400: {
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
              body: () => DeleteAgentResponseSchema,
            },
            400: {
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
              body: () => GetAgentsResponseSchema,
            },
            400: {
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
              body: () => GetTagsResponseSchema,
            },
            400: {
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
              body: () => PostNewAgentActionResponseSchema,
            },
            400: {
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
              body: () => PostNewAgentActionResponseSchema,
            },
            400: {
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
              body: () => PostRetrieveAgentsByActionsResponseSchema,
            },
            400: {
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
              body: () => schema.object({}),
            },
            400: {
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
              body: () => PostBulkActionResponseSchema,
            },
            400: {
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
              body: () => PostBulkActionResponseSchema,
            },
            400: {
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
              body: () => ListAgentUploadsResponseSchema,
            },
            400: {
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
              body: () => schema.stream(), // Readable
            },
            400: {
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
              body: () => DeleteAgentUploadFileResponseSchema,
            },
            400: {
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
              body: () => GetAgentStatusResponseSchema,
            },
            400: {
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
              body: () => GetAgentDataResponseSchema,
            },
            400: {
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
              body: () => schema.object({}),
            },
            400: {
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
              body: () => PostBulkActionResponseSchema,
            },
            400: {
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
              body: () => GetActionStatusResponseSchema,
            },
            400: {
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
              body: () => PostBulkActionResponseSchema,
            },
            400: {
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
              body: () => PostBulkActionResponseSchema,
            },
            400: {
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
              body: () => GetAvailableAgentVersionsResponseSchema,
            },
            400: {
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
              body: () => schema.string(),
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getAgentStatusRuntimeFieldHandler
    );
};
