/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  actionsMock,
  actionsClientMock,
  actionsAuthorizationMock,
} from '@kbn/actions-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import type { SandboxCallContext } from './tool_utils';
import {
  buildConnectorEnv,
  createConnectorCredentialResolver,
  redactSecrets,
} from './connector_credentials';

const CONNECTOR_ID = 'github-1';
const TOKEN = 'ghp_topsecrettokenvalue';

const createCallContext = (
  allowedConnectorIds: readonly string[] = [CONNECTOR_ID]
): SandboxCallContext => ({
  request: httpServerMock.createKibanaRequest(),
  allowedConnectorIds,
});

const createConnector = (overrides: Record<string, unknown> = {}) => ({
  id: CONNECTOR_ID,
  name: 'My GitHub',
  actionTypeId: '.github',
  config: { apiUrl: 'https://api.github.com', owner: 'elastic' },
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
  ...overrides,
});

const setup = ({
  connector = createConnector(),
  secrets = { token: TOKEN },
  canEncrypt = true,
  spaceId = 'default',
  inMemory = false,
  withActions = true,
  withEso = true,
}: {
  connector?: ReturnType<typeof createConnector>;
  secrets?: Record<string, unknown>;
  canEncrypt?: boolean;
  spaceId?: string;
  inMemory?: boolean;
  withActions?: boolean;
  withEso?: boolean;
} = {}) => {
  const actionsClient = actionsClientMock.create();
  actionsClient.get.mockResolvedValue(connector as any);
  const authorization = actionsAuthorizationMock.create();
  const actions = actionsMock.createStart();
  actions.getActionsClientWithRequest.mockResolvedValue(actionsClient);
  actions.getActionsAuthorizationWithRequest.mockReturnValue(authorization);
  actions.inMemoryConnectors = inMemory ? [{ ...connector, secrets } as any] : [];

  const esoClient = encryptedSavedObjectsMock.createClient();
  esoClient.getDecryptedAsInternalUser.mockResolvedValue({
    id: CONNECTOR_ID,
    type: 'action',
    references: [],
    attributes: { secrets },
  });
  const encryptedSavedObjects = encryptedSavedObjectsMock.createStart();
  encryptedSavedObjects.getClient.mockReturnValue(esoClient);

  const spaces = spacesMock.createStart();
  (spaces.spacesService.getSpaceId as jest.Mock).mockReturnValue(spaceId);

  const resolve = createConnectorCredentialResolver({
    getDeps: () => ({
      actions: withActions ? actions : undefined,
      encryptedSavedObjects: withEso ? encryptedSavedObjects : undefined,
      canEncrypt,
      spaces,
    }),
    logger: loggingSystemMock.createLogger(),
  });

  return { resolve, actions, actionsClient, authorization, esoClient, encryptedSavedObjects };
};

describe('buildConnectorEnv', () => {
  it('maps config and secrets to prefixed, upper-cased env vars', () => {
    const { env, secretValues } = buildConnectorEnv({
      connectorId: CONNECTOR_ID,
      actionTypeId: '.github',
      config: { apiUrl: 'https://api.github.com', 'nested-opt': { a: 1 }, port: 443, tls: true },
      secrets: { token: TOKEN, password: null, short: 'abc' },
    });

    expect(env).toEqual({
      CONNECTOR_ID,
      CONNECTOR_TYPE: '.github',
      CONNECTOR_CONFIG_APIURL: 'https://api.github.com',
      CONNECTOR_CONFIG_NESTED_OPT: '{"a":1}',
      CONNECTOR_CONFIG_PORT: '443',
      CONNECTOR_CONFIG_TLS: 'true',
      CONNECTOR_SECRET_TOKEN: TOKEN,
      CONNECTOR_SECRET_SHORT: 'abc',
    });
    // Very short values are not redacted: they would produce false positives in output.
    expect(secretValues).toEqual([TOKEN]);
  });
});

describe('redactSecrets', () => {
  it('replaces every occurrence of each secret value', () => {
    expect(redactSecrets(`token=${TOKEN} again ${TOKEN}`, [TOKEN])).toBe(
      'token=[REDACTED] again [REDACTED]'
    );
  });

  it('leaves text untouched when there is nothing to redact', () => {
    expect(redactSecrets('hello', [])).toBe('hello');
  });
});

describe('createConnectorCredentialResolver', () => {
  it('injects decrypted secrets and config for an allow-listed connector', async () => {
    const { resolve, authorization, esoClient } = setup();

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect(result).toEqual({
      env: {
        CONNECTOR_ID,
        CONNECTOR_TYPE: '.github',
        CONNECTOR_CONFIG_APIURL: 'https://api.github.com',
        CONNECTOR_CONFIG_OWNER: 'elastic',
        CONNECTOR_SECRET_TOKEN: TOKEN,
      },
      secretValues: [TOKEN],
    });
    expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: 'execute',
      actionTypeId: '.github',
    });
    expect(esoClient.getDecryptedAsInternalUser).toHaveBeenCalledWith('action', CONNECTOR_ID, {});
  });

  it('scopes decryption to the current space when not default', async () => {
    const { resolve, esoClient } = setup({ spaceId: 'team-a' });

    await resolve(CONNECTOR_ID, createCallContext());

    expect(esoClient.getDecryptedAsInternalUser).toHaveBeenCalledWith('action', CONNECTOR_ID, {
      namespace: 'team-a',
    });
  });

  it('uses in-memory secrets for preconfigured connectors without touching ESO', async () => {
    const { resolve, esoClient } = setup({
      connector: createConnector({ isPreconfigured: true }),
      inMemory: true,
    });

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect('env' in result && result.env.CONNECTOR_SECRET_TOKEN).toBe(TOKEN);
    expect(esoClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
  });

  it('denies connectors outside the agent allow-list before any lookup', async () => {
    const { resolve, actionsClient, esoClient } = setup();

    const result = await resolve('other-connector', createCallContext());

    expect(result).toEqual({
      errorMessage: expect.stringContaining(
        "Connector 'other-connector' is not assigned to this agent"
      ),
    });
    expect(actionsClient.get).not.toHaveBeenCalled();
    expect(esoClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
  });

  it('denies by default when the agent has no connectors', async () => {
    const { resolve } = setup();

    const result = await resolve(CONNECTOR_ID, createCallContext([]));

    expect(result).toEqual({ errorMessage: expect.stringContaining('Assigned connectors: none') });
  });

  it('fails when the user cannot read the connector', async () => {
    const { resolve, actionsClient, esoClient } = setup();
    actionsClient.get.mockRejectedValue(new Error('Unauthorized to get actions'));

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect(result).toEqual({
      errorMessage: expect.stringContaining(`Failed to resolve connector '${CONNECTOR_ID}'`),
    });
    expect(esoClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
  });

  it('fails when the user is not allowed to execute the connector type', async () => {
    const { resolve, authorization, esoClient } = setup();
    authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized to execute'));

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect(result).toEqual({
      errorMessage: expect.stringContaining(`Not authorized to use connector '${CONNECTOR_ID}'`),
    });
    expect(esoClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
  });

  it('rejects system connectors', async () => {
    const { resolve } = setup({ connector: createConnector({ isSystemAction: true }) });

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect(result).toEqual({ errorMessage: expect.stringContaining('system connector') });
  });

  it('fails when actions is unavailable', async () => {
    const { resolve } = setup({ withActions: false });

    expect(await resolve(CONNECTOR_ID, createCallContext())).toEqual({
      errorMessage: 'Connectors are not available in this deployment',
    });
  });

  it('fails when secrets cannot be decrypted (no encryption key)', async () => {
    const { resolve, esoClient } = setup({ canEncrypt: false });

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect(result).toEqual({ errorMessage: expect.stringContaining('cannot be decrypted') });
    expect(esoClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
  });

  it('does not leak decryption errors or secret material in the error message', async () => {
    const { resolve, esoClient } = setup();
    esoClient.getDecryptedAsInternalUser.mockRejectedValue(new Error(`boom ${TOKEN}`));

    const result = await resolve(CONNECTOR_ID, createCallContext());

    expect(result).toEqual({
      errorMessage: `Failed to load credentials for connector '${CONNECTOR_ID}'`,
    });
  });
});
