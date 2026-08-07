/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CoreSetup } from '@kbn/core/server';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { getConnectorSpec } from '@kbn/connector-specs';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { provisionConnectorFromSecretStepDefinition } from './provision_connector_from_secret';
import type { ConnectorProvisioningStartDeps } from '../types';
import type { ProvisionConnectorFromSecretInput } from '../../common/step_types/provision_connector_from_secret';

jest.mock('@kbn/connector-specs', () => ({
  ...jest.requireActual('@kbn/connector-specs'),
  getConnectorSpec: jest.fn(),
}));

const ALLOW_TOKEN: unique symbol = Symbol('test-allow-sensitive-output');
const CANARY = 'CANARY-9f3e2ab1-do-not-log';

const fakeTargetSpec: ConnectorSpec = {
  metadata: {
    id: '.fake_target',
    displayName: 'Fake target',
    description: 'A fake target connector used for tests.',
    minimumLicense: 'basic',
    supportedFeatureIds: [],
  },
  schema: z.object({ region: z.string() }),
  auth: { types: ['basic'] },
  actions: {},
  test: { handler: async () => ({}), enabled: true },
};

describe('provisionConnectorFromSecretStepDefinition handler', () => {
  const mockGetConnectorSpec = getConnectorSpec as jest.Mock;

  const makeActionsClient = () => ({
    execute: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  });

  const makeCoreSetup = (actionsClient: ReturnType<typeof makeActionsClient>) => {
    const actions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClient),
      getSensitiveOutputAccessToken: jest.fn().mockReturnValue(ALLOW_TOKEN),
    };
    return {
      getStartServices: jest.fn().mockResolvedValue([{}, { actions }]),
    } as unknown as CoreSetup<ConnectorProvisioningStartDeps>;
  };

  const makeContext = (
    input: ProvisionConnectorFromSecretInput
  ): StepHandlerContext<z.ZodType<ProvisionConnectorFromSecretInput>> =>
    ({
      input,
      config: {},
      rawInput: input,
      contextManager: { getFakeRequest: jest.fn().mockReturnValue({}) },
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      abortSignal: new AbortController().signal,
      stepId: 'step-1',
      stepType: 'connector-provisioning.provisionConnectorFromSecret',
    } as unknown as StepHandlerContext<z.ZodType<ProvisionConnectorFromSecretInput>>);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConnectorSpec.mockReturnValue(fakeTargetSpec);
  });

  it('auto-matches Vault secrets fields, takes config from literals, and ignores config-named Vault keys', async () => {
    const actionsClient = makeActionsClient();
    // The Vault secret also contains a `region` key, which collides by name with the
    // target's *config* field. It must be ignored (never written to cleartext config);
    // config comes only from the targetConnectorConfig literal.
    actionsClient.execute.mockResolvedValueOnce({
      status: 'ok',
      data: {
        values: { region: 'from-vault-should-be-ignored', username: 'svc', password: 'hunter2' },
      },
    });
    actionsClient.create.mockResolvedValueOnce({ id: 'new-id' });

    const coreSetup = makeCoreSetup(actionsClient);
    const definition = provisionConnectorFromSecretStepDefinition(coreSetup);

    const result = await definition.handler(
      makeContext({
        vaultConnectorId: 'vault-connector',
        targetConnectorTypeId: '.fake_target',
        targetConnectorName: 'My connector',
        targetConnectorConfig: { region: 'eu-west-1' },
        fieldBindings: [{ path: 'secret/data/a' }],
        mode: 'create',
      })
    );

    expect(result).toEqual({ output: { connectorId: 'new-id', action: 'created' } });
    expect(actionsClient.create).toHaveBeenCalledWith({
      action: {
        actionTypeId: '.fake_target',
        name: 'My connector',
        config: { region: 'eu-west-1' },
        // `authType` is the target spec's only auth type, defaulted by resolveAuthType()
        // -- it must be present since the generated secrets schema is a
        // z.discriminatedUnion('authType', ...), even though it's never itself an
        // auto-match/override target field.
        secrets: { authType: 'basic', username: 'svc', password: 'hunter2' },
      },
      options: undefined,
    });
    expect(actionsClient.execute).toHaveBeenCalledWith({
      actionId: 'vault-connector',
      params: { subAction: 'readSecret', subActionParams: { path: 'secret/data/a' } },
      allowSensitiveOutput: ALLOW_TOKEN,
    });
  });

  it('includes the resolved authType discriminator in the secrets sent to actionsClient.create (regression: schema is a discriminatedUnion keyed on authType)', async () => {
    const actionsClient = makeActionsClient();
    actionsClient.execute.mockResolvedValueOnce({
      status: 'ok',
      data: { values: { username: 'svc', password: 'hunter2' } },
    });
    actionsClient.create.mockResolvedValueOnce({ id: 'new-id' });

    const coreSetup = makeCoreSetup(actionsClient);
    const definition = provisionConnectorFromSecretStepDefinition(coreSetup);

    await definition.handler(
      makeContext({
        vaultConnectorId: 'vault-connector',
        targetConnectorTypeId: '.fake_target',
        targetConnectorName: 'My connector',
        authType: 'basic',
        targetConnectorConfig: { region: 'eu-west-1' },
        fieldBindings: [{ path: 'secret/data/a' }],
        mode: 'create',
      })
    );

    expect(actionsClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.objectContaining({
          secrets: expect.objectContaining({ authType: 'basic' }),
        }),
      })
    );
  });

  it('rejects target connector types that are not registered spec-based connectors', async () => {
    mockGetConnectorSpec.mockReturnValue(undefined);
    const actionsClient = makeActionsClient();
    const coreSetup = makeCoreSetup(actionsClient);
    const definition = provisionConnectorFromSecretStepDefinition(coreSetup);

    await expect(
      definition.handler(
        makeContext({
          vaultConnectorId: 'vault-connector',
          targetConnectorTypeId: '.not_a_spec_connector',
          targetConnectorName: 'My connector',
          fieldBindings: [{ path: 'secret/data/a' }],
          mode: 'create',
        })
      )
    ).rejects.toThrow(/not a spec-based connector type/);

    expect(actionsClient.execute).not.toHaveBeenCalled();
  });

  it("requires targetConnectorId for mode 'upsert', failing before any Vault read", async () => {
    const actionsClient = makeActionsClient();
    const coreSetup = makeCoreSetup(actionsClient);
    const definition = provisionConnectorFromSecretStepDefinition(coreSetup);

    await expect(
      definition.handler(
        makeContext({
          vaultConnectorId: 'vault-connector',
          targetConnectorTypeId: '.fake_target',
          targetConnectorName: 'My connector',
          fieldBindings: [{ path: 'secret/data/a' }],
          mode: 'upsert',
        })
      )
    ).rejects.toThrow(/requires targetConnectorId/);

    expect(actionsClient.execute).not.toHaveBeenCalled();
  });

  it('fails fast on an unrecognized explicit override targetField before any Vault read', async () => {
    const actionsClient = makeActionsClient();
    const coreSetup = makeCoreSetup(actionsClient);
    const definition = provisionConnectorFromSecretStepDefinition(coreSetup);

    await expect(
      definition.handler(
        makeContext({
          vaultConnectorId: 'vault-connector',
          targetConnectorTypeId: '.fake_target',
          targetConnectorName: 'My connector',
          authType: 'basic',
          fieldBindings: [{ path: 'secret/data/a', field: 'x', targetField: 'notARealField' }],
          mode: 'create',
        })
      )
    ).rejects.toThrow(/does not match any config or secrets field/);

    expect(actionsClient.execute).not.toHaveBeenCalled();
  });

  it('updates an existing connector of the matching type in upsert mode', async () => {
    const actionsClient = makeActionsClient();
    actionsClient.execute.mockResolvedValueOnce({
      status: 'ok',
      data: { values: { username: 'svc', password: 'hunter2' } },
    });
    actionsClient.get.mockResolvedValueOnce({ id: 'existing-id', actionTypeId: '.fake_target' });
    actionsClient.update.mockResolvedValueOnce({ id: 'existing-id' });

    const coreSetup = makeCoreSetup(actionsClient);
    const definition = provisionConnectorFromSecretStepDefinition(coreSetup);

    const result = await definition.handler(
      makeContext({
        vaultConnectorId: 'vault-connector',
        targetConnectorTypeId: '.fake_target',
        targetConnectorName: 'My connector',
        fieldBindings: [{ path: 'secret/data/a' }],
        mode: 'upsert',
        targetConnectorId: 'existing-id',
      })
    );

    expect(result).toEqual({ output: { connectorId: 'existing-id', action: 'updated' } });
  });

  it('never returns Vault-resolved values as step output (only connectorId/action)', async () => {
    const actionsClient = makeActionsClient();
    actionsClient.execute.mockResolvedValueOnce({
      status: 'ok',
      data: { values: { region: 'eu-west-1', username: CANARY, password: CANARY } },
    });
    actionsClient.create.mockResolvedValueOnce({ id: 'new-id' });

    const coreSetup = makeCoreSetup(actionsClient);
    const definition = provisionConnectorFromSecretStepDefinition(coreSetup);

    const result = await definition.handler(
      makeContext({
        vaultConnectorId: 'vault-connector',
        targetConnectorTypeId: '.fake_target',
        targetConnectorName: 'My connector',
        fieldBindings: [{ path: 'secret/data/a' }],
        mode: 'create',
      })
    );

    expect(JSON.stringify(result)).not.toContain(CANARY);
    expect(Object.keys(result.output ?? {}).sort()).toEqual(['action', 'connectorId']);
  });

  it('fails fast on a field-source collision between a secrets literal and an auto-matched Vault field', async () => {
    const actionsClient = makeActionsClient();
    actionsClient.execute.mockResolvedValueOnce({
      status: 'ok',
      data: { values: { password: 'from-vault' } },
    });

    const coreSetup = makeCoreSetup(actionsClient);
    const definition = provisionConnectorFromSecretStepDefinition(coreSetup);

    await expect(
      definition.handler(
        makeContext({
          vaultConnectorId: 'vault-connector',
          targetConnectorTypeId: '.fake_target',
          targetConnectorName: 'My connector',
          targetConnectorSecrets: { password: 'from-literal' },
          fieldBindings: [{ path: 'secret/data/a' }],
          mode: 'create',
        })
      )
    ).rejects.toThrow(/conflicting sources/);

    expect(actionsClient.create).not.toHaveBeenCalled();
  });

  it('rejects an explicit override that maps a Vault value into a cleartext config field', async () => {
    const actionsClient = makeActionsClient();
    const coreSetup = makeCoreSetup(actionsClient);
    const definition = provisionConnectorFromSecretStepDefinition(coreSetup);

    await expect(
      definition.handler(
        makeContext({
          vaultConnectorId: 'vault-connector',
          targetConnectorTypeId: '.fake_target',
          targetConnectorName: 'My connector',
          fieldBindings: [{ path: 'secret/data/a', field: 'anything', targetField: 'region' }],
          mode: 'create',
        })
      )
    ).rejects.toThrow(/stored in cleartext.*may only populate secrets/s);

    expect(actionsClient.execute).not.toHaveBeenCalled();
  });
});
