/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { CreateWorkflowCommandSchema } from '@kbn/workflows';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_CREATE_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export function registerCreateWorkflowRoute(deps: RouteDependencies) {
  const { router, api, spaces, audit } = deps;
  router.versioned
    .post({
      path: '/api/workflows/workflow',
      access: 'public',
      security: WORKFLOW_CREATE_SECURITY,
      summary: 'Create a workflow',
      description:
        'Create a new workflow from a YAML definition. The YAML is validated and parsed before the workflow is saved. An optional custom ID can be provided.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/create_workflow.yaml'),
        },
        validate: {
          request: {
            body: CreateWorkflowCommandSchema,
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const spaceId = spaces.getSpaceId(request);
          const createdWorkflow = await api.createWorkflow(request.body, spaceId, request);
          audit.logWorkflowCreated(request, {
            id: createdWorkflow.id,
          });
          return response.ok({ body: createdWorkflow });
        } catch (error) {
          audit.logWorkflowCreateFailed(request, error);
          return handleRouteError(response, error);
        }
      })
    );
}
