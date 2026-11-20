/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorsSpecs } from '@kbn/connector-specs';
import {
  createActionsConnectorSpecProvider,
  createPackageConnectorSpecProvider,
  type SpecActionsClient,
  type SpecActionsStart,
} from './connector_spec_provider';
import { formatSchemaForLlm } from './tools';

const SLACK_CONNECTOR_TYPE_ID = '.slack2';

const packageProvider = createPackageConnectorSpecProvider();

/** Serves the package provider's data the way the actions plugin's start contract and client do. */
const actionsStart: SpecActionsStart = {
  listTypes: (_featureId, options) =>
    packageProvider
      .listSpecs()
      .filter(({ id }) => !options?.typeId || id === options.typeId)
      .map((specSummary) => ({ specSummary })),
};

const actionsClient: jest.Mocked<SpecActionsClient> = {
  getConnectorSpec: jest.fn(async ({ id }) => {
    const { skill, actions = [] } = (await packageProvider.getSpecDetail(id)) ?? {};
    return { ...(skill !== undefined ? { skill } : {}), actions };
  }),
};

describe('connector spec providers', () => {
  const actionsProvider = createActionsConnectorSpecProvider({ actionsStart, actionsClient });
  const ids = Object.values(connectorsSpecs).map(({ metadata }) => metadata.id);

  it('serve the same specs through the actions-backed provider', async () => {
    expect(actionsProvider.listSpecs()).toEqual(packageProvider.listSpecs());

    for (const id of ids) {
      expect(actionsProvider.getSpec(id)).toEqual(packageProvider.getSpec(id));
      expect(await actionsProvider.getSpecDetail(id)).toEqual(
        await packageProvider.getSpecDetail(id)
      );
    }
  });

  it('return undefined for types without a spec, without calling the client', async () => {
    actionsClient.getConnectorSpec.mockClear();

    expect(actionsProvider.getSpec('.unknown')).toBeUndefined();
    expect(await actionsProvider.getSpecDetail('.unknown')).toBeUndefined();
    expect(await packageProvider.getSpecDetail('.unknown')).toBeUndefined();
    expect(actionsClient.getConnectorSpec).not.toHaveBeenCalled();
  });

  it.each(['listChannels', 'resolveChannelId', 'listUserConversations'])(
    'package provider lists the parameters of slack %s instead of an empty schema',
    async (actionName) => {
      const detail = await packageProvider.getSpecDetail(SLACK_CONNECTOR_TYPE_ID);
      const action = detail?.actions.find(({ name }) => name === actionName);

      expect(action).toBeDefined();
      expect(formatSchemaForLlm(action!.inputSchema)).not.toBe('No parameters');
    }
  );
});
