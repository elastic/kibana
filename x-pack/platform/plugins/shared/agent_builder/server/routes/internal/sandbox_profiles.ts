/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SandboxProfileCreateRequest } from '@kbn/agent-builder-common';
import { DEFAULT_SANDBOX_POLICY } from '@kbn/agent-builder-common';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { internalApiPath } from '../../../common/constants';
import { apiPrivileges } from '../../../common/features';
import {
  getSandboxProfileClient,
  canEncryptSandboxProfiles,
  resolveProfileWithSecrets,
} from '../../services/sandboxes';
import { getOpencodeSubagentExecutor } from '../../services/execution/opencode_subagent';

const READ_SECURITY = { authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] } };
const WRITE_SECURITY = { authz: { requiredPrivileges: [apiPrivileges.writeAgentBuilder] } };

// Two compute providers today (local Kubernetes + Cloud Run) and one runtime
// (opencode). The connection schema is a closed discriminated union so an
// unknown provider fails validation loudly rather than silently.
const localK8sConnectionSchema = schema.object({
  type: schema.literal('local-k8s'),
  kubeContext: schema.string({ minLength: 1 }),
  namespace: schema.string({ minLength: 1 }),
  image: schema.string({ minLength: 1 }),
});

const cloudRunConnectionSchema = schema.object({
  type: schema.literal('cloud-run'),
  project: schema.string({ minLength: 1 }),
  region: schema.string({ minLength: 1 }),
  bridgeUrl: schema.uri({ scheme: ['http', 'https'] }),
  audience: schema.maybe(schema.string()),
});

const connectionSchema = schema.oneOf([localK8sConnectionSchema, cloudRunConnectionSchema]);

const opencodeRuntimeConfigSchema = schema.object({
  type: schema.literal('opencode'),
  baseUrl: schema.string({ minLength: 1 }),
  orchestratorModel: schema.string({ minLength: 1 }),
  coderModel: schema.string({ minLength: 1 }),
});

const piRuntimeConfigSchema = schema.object({
  type: schema.literal('pi'),
  baseUrl: schema.string({ minLength: 1 }),
  model: schema.string({ minLength: 1 }),
});

const runtimeConfigSchema = schema.oneOf([opencodeRuntimeConfigSchema, piRuntimeConfigSchema]);

const policySchema = schema.object({
  // Capability tier (named preset over the axes below); axes may override it.
  tier: schema.maybe(
    schema.oneOf([
      schema.literal('restricted'),
      schema.literal('investigate'),
      schema.literal('contribute'),
      schema.literal('trusted'),
    ])
  ),
  idleTtlMs: schema.number({ min: 60_000, defaultValue: DEFAULT_SANDBOX_POLICY.idleTtlMs }),
  maxLifetimeMs: schema.number({
    min: 60_000,
    defaultValue: DEFAULT_SANDBOX_POLICY.maxLifetimeMs,
  }),
  maxRunSeconds: schema.number({ min: 60, defaultValue: DEFAULT_SANDBOX_POLICY.maxRunSeconds }),
  // Axis 1: compute (enforced by the provider).
  filesystem: schema.maybe(
    schema.oneOf([schema.literal('ephemeral-ro'), schema.literal('ephemeral-rw')])
  ),
  allowShell: schema.maybe(schema.boolean()),
  // Axis 2: network (enforced by the provider).
  egress: schema.maybe(
    schema.oneOf([schema.literal('deny'), schema.literal('allowlist'), schema.literal('open')])
  ),
  egressAllowlist: schema.maybe(schema.arrayOf(schema.string())),
  // Axis 3: Kibana data/tools (enforced by the broker).
  connectorAccess: schema.maybe(
    schema.oneOf([schema.literal('none'), schema.literal('read'), schema.literal('write')])
  ),
  allowedConnectors: schema.maybe(schema.arrayOf(schema.string())),
  // Axis 4: git/repo (enforced by the broker).
  git: schema.maybe(
    schema.object({
      mode: schema.oneOf([
        schema.literal('none'),
        schema.literal('clone-ro'),
        schema.literal('push-pr'),
      ]),
      repos: schema.maybe(schema.arrayOf(schema.string())),
    })
  ),
});

const createBodySchema = schema.object({
  id: schema.maybe(schema.string()),
  name: schema.string({ minLength: 1, maxLength: 200 }),
  description: schema.maybe(schema.string({ maxLength: 2000 })),
  provider: schema.oneOf([schema.literal('local-k8s'), schema.literal('cloud-run')]),
  runtime: schema.oneOf([schema.literal('opencode'), schema.literal('pi')]),
  connection: connectionSchema,
  runtimeConfig: runtimeConfigSchema,
  policy: policySchema,
  secrets: schema.maybe(schema.recordOf(schema.string(), schema.string())),
});

const updateBodySchema = schema.object({
  name: schema.maybe(schema.string({ minLength: 1, maxLength: 200 })),
  description: schema.maybe(schema.string({ maxLength: 2000 })),
  connection: schema.maybe(connectionSchema),
  runtimeConfig: schema.maybe(runtimeConfigSchema),
  policy: schema.maybe(policySchema),
  secrets: schema.maybe(schema.recordOf(schema.string(), schema.string())),
});

/**
 * CRUD + test-connection for Sandbox Profiles (the compute+runtime+policy an
 * agent "brings"). Profiles are Encrypted Saved Objects; secrets never leave the
 * server. Gated on the write privilege for mutations, read for the rest.
 */
export function registerInternalSandboxProfileRoutes({ router, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // ---- List --------------------------------------------------------------
  router.get(
    {
      path: `${internalApiPath}/sandbox_profiles`,
      security: READ_SECURITY,
      options: { access: 'internal' },
      validate: false,
    },
    wrapHandler(async (ctx, request, response) => {
      const client = getSandboxProfileClient(request);
      const profiles = await client.list();
      return response.ok({ body: { profiles, canEncrypt: canEncryptSandboxProfiles() } });
    })
  );

  // ---- Get one -----------------------------------------------------------
  router.get(
    {
      path: `${internalApiPath}/sandbox_profiles/{id}`,
      security: READ_SECURITY,
      options: { access: 'internal' },
      validate: { params: schema.object({ id: schema.string() }) },
    },
    wrapHandler(async (ctx, request, response) => {
      const client = getSandboxProfileClient(request);
      const profile = await client.get(request.params.id);
      if (!profile) return response.notFound({ body: { message: 'Sandbox profile not found' } });
      return response.ok({ body: { profile } });
    })
  );

  // ---- Create ------------------------------------------------------------
  router.post(
    {
      path: `${internalApiPath}/sandbox_profiles`,
      security: WRITE_SECURITY,
      options: { access: 'internal' },
      validate: { body: createBodySchema },
    },
    wrapHandler(async (ctx, request, response) => {
      if (!canEncryptSandboxProfiles()) {
        return response.customError({
          statusCode: 400,
          body: {
            message:
              'Encryption key is not configured (xpack.encryptedSavedObjects.encryptionKey); cannot store sandbox profiles.',
          },
        });
      }
      const client = getSandboxProfileClient(request);
      const profile = await client.create(request.body as SandboxProfileCreateRequest);
      return response.ok({ body: { profile } });
    })
  );

  // ---- Update ------------------------------------------------------------
  router.put(
    {
      path: `${internalApiPath}/sandbox_profiles/{id}`,
      security: WRITE_SECURITY,
      options: { access: 'internal' },
      validate: {
        params: schema.object({ id: schema.string() }),
        body: updateBodySchema,
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const client = getSandboxProfileClient(request);
      const profile = await client.update(request.params.id, request.body);
      return response.ok({ body: { profile } });
    })
  );

  // ---- Delete ------------------------------------------------------------
  router.delete(
    {
      path: `${internalApiPath}/sandbox_profiles/{id}`,
      security: WRITE_SECURITY,
      options: { access: 'internal' },
      validate: { params: schema.object({ id: schema.string() }) },
    },
    wrapHandler(async (ctx, request, response) => {
      const client = getSandboxProfileClient(request);
      await client.delete(request.params.id);
      return response.ok({ body: { deleted: true } });
    })
  );

  // ---- Test connection ---------------------------------------------------
  // Proves the profile can actually run a coding sub-agent: provider metadata +
  // provision a throwaway sandbox + `echo` + teardown.
  router.post(
    {
      path: `${internalApiPath}/sandbox_profiles/{id}/test`,
      security: READ_SECURITY,
      options: { access: 'internal' },
      validate: { params: schema.object({ id: schema.string() }) },
    },
    wrapHandler(async (ctx, request, response) => {
      const executor = getOpencodeSubagentExecutor();
      if (!executor) {
        return response.customError({
          statusCode: 400,
          body: { message: 'The coding sub-agent capability is not enabled on this server.' },
        });
      }
      const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();
      const profile = await resolveProfileWithSecrets(request.params.id, { namespace: spaceId });
      if (!profile) return response.notFound({ body: { message: 'Sandbox profile not found' } });
      const result = await executor.testProfile(profile);
      return response.ok({ body: result });
    })
  );

  // ---- Metadata for a profile (no run) -----------------------------------
  router.get(
    {
      path: `${internalApiPath}/sandbox_profiles/{id}/metadata`,
      security: READ_SECURITY,
      options: { access: 'internal' },
      validate: { params: schema.object({ id: schema.string() }) },
    },
    wrapHandler(async (ctx, request, response) => {
      const executor = getOpencodeSubagentExecutor();
      if (!executor) return response.ok({ body: { enabled: false } });
      const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();
      const profile = await resolveProfileWithSecrets(request.params.id, { namespace: spaceId });
      if (!profile) return response.notFound({ body: { message: 'Sandbox profile not found' } });
      const metadata = await executor.getProfileMetadata(profile);
      return response.ok({ body: { enabled: true, metadata } });
    })
  );
}
