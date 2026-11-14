/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  connectorsSpecs,
  isEarsExperimentalConnector,
  resolveActionScope,
} from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';
import {
  createActionsConnectorSpecProvider,
  createPackageConnectorSpecProvider,
  type SpecActionsClient,
  type SpecActionsStart,
} from './connector_spec_provider';

const specs = Object.values(connectorsSpecs);

/** Serves the in-tree specs the way the actions plugin does, so both providers can be compared. */
const actionsStart: SpecActionsStart = {
  getConnectorSpecSummaries: () =>
    specs.map((spec) => ({
      id: spec.metadata.id,
      displayName: spec.metadata.displayName,
      description: spec.metadata.description,
      ...(spec.metadata.icon !== undefined ? { icon: spec.metadata.icon } : {}),
      isTechnicalPreview: spec.metadata.isTechnicalPreview ?? false,
      isEarsExperimental: isEarsExperimentalConnector(spec.metadata.id),
      authTypeIds: (spec.auth?.types ?? []).map((authType) =>
        typeof authType === 'string' ? authType : authType.type
      ),
      actions: Object.entries(spec.actions).map(([name, def]) => ({
        name,
        ...(def.description !== undefined ? { description: def.description } : {}),
        isTool: Boolean(def.isTool),
        scope: resolveActionScope(def),
      })),
    })),
};

const actionsClient: jest.Mocked<SpecActionsClient> = {
  getConnectorSpec: jest.fn(async ({ id }) => {
    const spec = specs.find((s) => s.metadata.id === id)!;
    return {
      ...(spec.skill !== undefined ? { skill: spec.skill } : {}),
      actions: Object.entries(spec.actions).map(([name, def]) => ({
        name,
        isTool: Boolean(def.isTool),
        scope: resolveActionScope(def),
        inputSchema: z.toJSONSchema(def.input, { unrepresentable: 'any', io: 'input' }) as Record<
          string,
          unknown
        >,
      })),
    };
  }),
};

describe('connector spec providers', () => {
  const packageProvider = createPackageConnectorSpecProvider();
  const actionsProvider = createActionsConnectorSpecProvider({ actionsStart, actionsClient });

  it('list the same specs', async () => {
    expect(await actionsProvider.listSpecs()).toEqual(await packageProvider.listSpecs());
  });

  it.each(specs.map((spec) => spec.metadata.id))('%s: same summary and detail', async (id) => {
    expect(await actionsProvider.getSpec(id)).toEqual(await packageProvider.getSpec(id));
    expect(await actionsProvider.getSpecDetail(id)).toEqual(
      await packageProvider.getSpecDetail(id)
    );
  });

  it('return undefined for types without a spec', async () => {
    actionsClient.getConnectorSpec.mockClear();

    expect(await actionsProvider.getSpec('.unknown')).toBeUndefined();
    expect(await actionsProvider.getSpecDetail('.unknown')).toBeUndefined();
    expect(await packageProvider.getSpecDetail('.unknown')).toBeUndefined();
    expect(actionsClient.getConnectorSpec).not.toHaveBeenCalled();
  });
});
