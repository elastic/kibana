/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { IAC_PROVISIONER_API_ROUTES, API_VERSIONS } from '../../../common/constants';
import type { FleetAuthzRouter } from '../../services/security';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';

import { genericErrorResponse, notFoundResponse } from '../schema/errors';
import {
  RenderIacTemplateRequestSchema,
  RenderIacTemplateResponseSchema,
} from '../../types/rest_spec/iac_provisioner';
import {
  CreateIacCallbackRequestSchema,
  CreateIacCallbackResponseSchema,
  DeleteIacCallbackRequestSchema,
  DeleteIacCallbackResponseSchema,
  GetIacCallbackAvailabilityResponseSchema,
  GetIacCallbackRequestSchema,
  GetIacCallbackResponseSchema,
  ReceiveIacCallbackRequestSchema,
  ReceiveIacCallbackResponseSchema,
} from '../../types/rest_spec/iac_callback';

import {
  createIacCallbackHandler,
  deleteIacCallbackHandler,
  getIacCallbackAvailabilityHandler,
  getIacCallbackHandler,
  receiveIacCallbackHandler,
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

const IAC_CALLBACK_WRITE_SECURITY = {
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
      summary: 'Check IaC callback availability',
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
              body: () => GetIacCallbackAvailabilityResponseSchema,
            },
            404: { description: 'AWS identity federation is not enabled.', body: notFoundResponse },
          },
        },
      },
      getIacCallbackAvailabilityHandler
    );

  router.versioned
    .post({
      path: IAC_PROVISIONER_API_ROUTES.CALLBACK_CREATE_PATTERN,
      summary: 'Create an IaC callback',
      description:
        'Create a one-time record and a short-lived, zero-privilege API key that a launched CloudFormation stack uses to report its role back to Kibana. The identity name, account type, and template details are stored on the record for the cloud connector the report creates.',
      access: 'internal',
      security: IAC_CALLBACK_WRITE_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: CreateIacCallbackRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => CreateIacCallbackResponseSchema,
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
      createIacCallbackHandler
    );

  router.versioned
    .get({
      path: IAC_PROVISIONER_API_ROUTES.CALLBACK_INFO_PATTERN,
      summary: 'Get an IaC callback',
      description: 'Get the state of a callback record. Never returns the API key.',
      access: 'internal',
      security: IAC_PROVISIONER_ROUTE_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: GetIacCallbackRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetIacCallbackResponseSchema,
            },
            404: { description: 'Not found.', body: notFoundResponse },
          },
        },
      },
      getIacCallbackHandler
    );

  router.versioned
    .delete({
      path: IAC_PROVISIONER_API_ROUTES.CALLBACK_DELETE_PATTERN,
      summary: 'Cancel an IaC callback',
      description:
        'Retire a callback record the form no longer waits on and invalidate its API key. A record the stack has already reported to is returned unchanged.',
      access: 'internal',
      security: IAC_CALLBACK_WRITE_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: DeleteIacCallbackRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => DeleteIacCallbackResponseSchema,
            },
            404: { description: 'Not found.', body: notFoundResponse },
          },
        },
      },
      deleteIacCallbackHandler
    );

  // Public: the stack's Lambda calls this with the record's API key. Kibana rejects an invalid
  // key before the handler runs; the handler then checks that the key belongs to the record.
  router.versioned
    .post({
      path: IAC_PROVISIONER_API_ROUTES.CALLBACK_RECEIVE_PATTERN,
      summary: 'Receive an IaC callback',
      operationId: 'receive-iac-callback',
      description:
        'Called by the CloudFormation stack launched from Kibana to report the IAM role ARN and stack ARN it created. Authenticate with the one-time API key issued when the callback was created, sent as `Authorization: ApiKey <encoded-key>`. The key has no other privileges and is invalidated after the first successful report. `role_arn` and `stack_arn` must be in the same AWS account. A repeat report with the same values succeeds; different values return 409.',
      access: 'public',
      security: {
        authz: {
          enabled: false,
          reason: 'Authorized by the per-callback API key bound to the record in the handler',
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
          oasOperationObject: () => path.join(__dirname, 'examples/post_iac_callback.yaml'),
        },
        validate: {
          request: ReceiveIacCallbackRequestSchema,
          response: {
            200: {
              description: 'OK: the values were stored, or were already stored.',
              body: () => ReceiveIacCallbackResponseSchema,
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
      receiveIacCallbackHandler
    );
};
