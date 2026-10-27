/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { IAC_PROVISIONER_API_ROUTES, API_VERSIONS } from '../../../common/constants';
import type { FleetAuthzRouter } from '../../services/security';
import { withDefaultErrorHandler } from '../../services/security/fleet_router';
import { getRequestStore } from '../../services/request_store';
import type { FleetRouter } from '../../types/request_context';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';

import { genericErrorResponse, notFoundResponse } from '../schema/errors';
import {
  RenderIacTemplateRequestSchema,
  RenderIacTemplateResponseSchema,
} from '../../types/rest_spec/iac_provisioner';
import {
  CreateProvisioningCallbackRequestSchema,
  CreateProvisioningCallbackResponseSchema,
  DeleteProvisioningCallbackRequestSchema,
  DeleteProvisioningCallbackResponseSchema,
  GetProvisioningCallbackAvailabilityResponseSchema,
  GetProvisioningCallbackRequestSchema,
  GetProvisioningCallbackResponseSchema,
  ReceiveProvisioningCallbackRequestSchema,
  ReceiveProvisioningCallbackResponseSchema,
} from '../../types/rest_spec/provisioning_callback';

import {
  createProvisioningCallbackHandler,
  deleteProvisioningCallbackHandler,
  getProvisioningCallbackAvailabilityHandler,
  getProvisioningCallbackHandler,
  receiveProvisioningCallbackHandler,
  renderIacTemplateHandler,
} from './handlers';

const IAC_PROVISIONER_ROUTE_SECURITY = {
  authz: {
    // Read + proxy only: the handler reads package info and forwards to
    // the IaC Provisioner. It never writes Fleet objects, so READ is the
    // correct level — matching the sibling GET cloud-connector routes.
    requiredPrivileges: [
      {
        anyRequired: [
          FLEET_API_PRIVILEGES.AGENT_POLICIES.READ,
          FLEET_API_PRIVILEGES.INTEGRATIONS.READ,
        ],
      },
    ],
  },
};

const PROVISIONING_CALLBACK_WRITE_SECURITY = {
  authz: {
    // Creates an API key, so it needs the same privileges as creating an identity.
    requiredPrivileges: [
      {
        anyRequired: [
          FLEET_API_PRIVILEGES.AGENT_POLICIES.ALL,
          FLEET_API_PRIVILEGES.INTEGRATIONS.ALL,
        ],
      },
    ],
  },
};

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .post({
      path: IAC_PROVISIONER_API_ROUTES.RENDER_TEMPLATE_PATTERN,
      summary: 'Render an IaC template',
      description:
        'Render a deployable IaC template for the enabled integrations via the IaC Provisioner.',
      access: 'internal',
      security: IAC_PROVISIONER_ROUTE_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: RenderIacTemplateRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => RenderIacTemplateResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      renderIacTemplateHandler
    );

  router.versioned
    .get({
      path: IAC_PROVISIONER_API_ROUTES.CALLBACK_AVAILABILITY_PATTERN,
      summary: 'Check provisioning callback availability',
      description:
        'Whether a launched CloudFormation stack could report back to this Kibana: server.publicBaseUrl must be set and be an https URL. Returns the URL the stack is given, or the reason the callback cannot be used.',
      access: 'internal',
      security: IAC_PROVISIONER_ROUTE_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {},
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetProvisioningCallbackAvailabilityResponseSchema,
            },
            404: { description: 'AWS identity federation is not enabled.', body: notFoundResponse },
          },
        },
      },
      getProvisioningCallbackAvailabilityHandler
    );

  router.versioned
    .post({
      path: IAC_PROVISIONER_API_ROUTES.CALLBACK_CREATE_PATTERN,
      summary: 'Create a provisioning callback',
      description:
        'Create a one-time record and a short-lived, zero-privilege API key that a launched CloudFormation stack uses to report its role back to Kibana. The identity name, account type, and template details are stored on the record for the cloud connector the report creates.',
      access: 'internal',
      security: PROVISIONING_CALLBACK_WRITE_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: CreateProvisioningCallbackRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => CreateProvisioningCallbackResponseSchema,
            },
            400: { description: 'A bad request.', body: genericErrorResponse },
            404: { description: 'AWS identity federation is not enabled.', body: notFoundResponse },
            412: {
              description: 'The public Kibana URL is not https.',
              body: genericErrorResponse,
            },
          },
        },
      },
      createProvisioningCallbackHandler
    );

  router.versioned
    .get({
      path: IAC_PROVISIONER_API_ROUTES.CALLBACK_INFO_PATTERN,
      summary: 'Get a provisioning callback',
      description: 'Get the state of a callback record. Never returns the API key.',
      access: 'internal',
      security: IAC_PROVISIONER_ROUTE_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: GetProvisioningCallbackRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetProvisioningCallbackResponseSchema,
            },
            404: { description: 'Not found.', body: notFoundResponse },
          },
        },
      },
      getProvisioningCallbackHandler
    );

  router.versioned
    .delete({
      path: IAC_PROVISIONER_API_ROUTES.CALLBACK_DELETE_PATTERN,
      summary: 'Cancel a provisioning callback',
      description:
        'Retire a callback record the form no longer waits on and invalidate its API key. A record the stack has already reported to is returned unchanged.',
      access: 'internal',
      security: PROVISIONING_CALLBACK_WRITE_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: DeleteProvisioningCallbackRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => DeleteProvisioningCallbackResponseSchema,
            },
            404: { description: 'Not found.', body: notFoundResponse },
          },
        },
      },
      deleteProvisioningCallbackHandler
    );
};

/**
 * The route the stack's Lambda calls. It goes on the plain router: the Fleet router checks the
 * caller's Fleet privileges on every request, and this caller has no identity to check.
 */
export const registerPublicRoutes = (router: FleetRouter) => {
  router.versioned
    .post({
      path: IAC_PROVISIONER_API_ROUTES.CALLBACK_RECEIVE_PATTERN,
      summary: 'Receive a provisioning callback',
      operationId: 'receive-provisioning-callback',
      description:
        'Called by the CloudFormation stack launched from Kibana to report the IAM role ARN and stack ARN it created. The request is not authenticated: present the one-time token issued when the callback was created in the `x-elastic-callback-token` header. The token is not an Elasticsearch credential and admits nothing but this report. `role_arn` and `stack_arn` must be in the same AWS account. While the record is pending, a repeat report with the same values succeeds and different values return 409; an expired or cancelled record returns 410.',
      access: 'public',
      security: {
        authc: {
          enabled: false,
          reason:
            'The caller is a Lambda in the customer AWS account with no Kibana identity; the record it reports to is admitted by its own token, checked in the handler',
        },
        authz: {
          enabled: false,
          reason: 'Authorized by the per-callback token bound to the record in the handler',
        },
      },
      options: {
        tags: ['oas-tag:Fleet IaC provisioner'],
        availability: {
          since: '9.6.0',
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        options: {
          oasOperationObject: () =>
            path.join(__dirname, 'examples/post_provisioning_callback.yaml'),
        },
        validate: {
          request: ReceiveProvisioningCallbackRequestSchema,
          response: {
            200: {
              description: 'OK: the values were stored, or were already stored.',
              body: () => ReceiveProvisioningCallbackResponseSchema,
            },
            400: { description: 'A bad request.', body: genericErrorResponse },
            404: { description: 'Not found.', body: notFoundResponse },
            409: {
              description: 'Different values were already received for this callback.',
              body: genericErrorResponse,
            },
            410: {
              description: 'The callback has expired or was cancelled.',
              body: genericErrorResponse,
            },
          },
        },
      },
      withDefaultErrorHandler((context, request, response) =>
        getRequestStore().run(request, () =>
          receiveProvisioningCallbackHandler(context, request, response)
        )
      )
    );
};
