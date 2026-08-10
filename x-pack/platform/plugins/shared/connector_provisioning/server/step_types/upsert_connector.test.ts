/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { upsertConnector } from './upsert_connector';

const CANARY = 'CANARY-9f3e2ab1-do-not-log';

describe('upsertConnector', () => {
  const makeActionsClient = () =>
    ({
      create: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ActionsClient>);

  const baseParams = {
    targetConnectorTypeId: '.fake_connector',
    targetConnectorName: 'My connector',
    config: { region: 'eu-west-1' },
    secrets: { clientSecret: 'xyz' },
  };

  describe("mode: 'create'", () => {
    it('creates a connector and returns its id', async () => {
      const actionsClient = makeActionsClient();
      actionsClient.create.mockResolvedValueOnce({ id: 'new-id' } as never);

      const result = await upsertConnector({
        actionsClient,
        mode: 'create',
        targetConnectorId: undefined,
        ...baseParams,
      });

      expect(result).toEqual({ connectorId: 'new-id', action: 'created' });
      expect(actionsClient.create).toHaveBeenCalledWith({
        action: {
          actionTypeId: '.fake_connector',
          name: 'My connector',
          config: baseParams.config,
          secrets: baseParams.secrets,
        },
        options: undefined,
      });
    });

    it('passes a caller-chosen id through options when provided', async () => {
      const actionsClient = makeActionsClient();
      actionsClient.create.mockResolvedValueOnce({ id: 'chosen-id' } as never);

      await upsertConnector({
        actionsClient,
        mode: 'create',
        targetConnectorId: 'chosen-id',
        ...baseParams,
      });

      expect(actionsClient.create).toHaveBeenCalledWith(
        expect.objectContaining({ options: { id: 'chosen-id' } })
      );
    });

    it('propagates an id-collision 409 unmodified (fails loudly, never overwrites)', async () => {
      const actionsClient = makeActionsClient();
      const conflict = Boom.conflict(`id conflict: ${CANARY}`);
      actionsClient.create.mockRejectedValueOnce(conflict);

      await expect(
        upsertConnector({
          actionsClient,
          mode: 'create',
          targetConnectorId: 'existing-id',
          ...baseParams,
        })
      ).rejects.toBe(conflict);
    });

    it('sanitizes any other create() failure into a generic, value-free error (guarantee 4b)', async () => {
      const actionsClient = makeActionsClient();
      actionsClient.create.mockRejectedValueOnce(new Error(`validation failed: ${CANARY}`));

      await expect(
        upsertConnector({
          actionsClient,
          mode: 'create',
          targetConnectorId: undefined,
          ...baseParams,
        })
      ).rejects.toThrow(/rejected the provided configuration/);

      try {
        await upsertConnector({
          actionsClient,
          mode: 'create',
          targetConnectorId: undefined,
          ...baseParams,
        });
        throw new Error('expected upsertConnector to throw');
      } catch (error) {
        expect((error as Error).message).not.toContain(CANARY);
        expect((error as Error).message).toContain('region');
        expect((error as Error).message).toContain('clientSecret');
      }
    });
  });

  describe("mode: 'upsert'", () => {
    it('requires targetConnectorId', async () => {
      await expect(
        upsertConnector({
          actionsClient: makeActionsClient(),
          mode: 'upsert',
          targetConnectorId: undefined,
          ...baseParams,
        })
      ).rejects.toThrow(/requires targetConnectorId/);
    });

    it('creates the connector when it does not yet exist', async () => {
      const actionsClient = makeActionsClient();
      actionsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError('action', 'target-id')
      );
      actionsClient.create.mockResolvedValueOnce({ id: 'target-id' } as never);

      const result = await upsertConnector({
        actionsClient,
        mode: 'upsert',
        targetConnectorId: 'target-id',
        ...baseParams,
      });

      expect(result).toEqual({ connectorId: 'target-id', action: 'created' });
      expect(actionsClient.update).not.toHaveBeenCalled();
    });

    it('updates the connector when it exists with a matching type', async () => {
      const actionsClient = makeActionsClient();
      actionsClient.get.mockResolvedValueOnce({
        id: 'target-id',
        actionTypeId: '.fake_connector',
      } as never);
      actionsClient.update.mockResolvedValueOnce({ id: 'target-id' } as never);

      const result = await upsertConnector({
        actionsClient,
        mode: 'upsert',
        targetConnectorId: 'target-id',
        ...baseParams,
      });

      expect(result).toEqual({ connectorId: 'target-id', action: 'updated' });
      expect(actionsClient.create).not.toHaveBeenCalled();
      expect(actionsClient.update).toHaveBeenCalledWith({
        id: 'target-id',
        action: { name: 'My connector', config: baseParams.config, secrets: baseParams.secrets },
      });
    });

    it('rejects a type mismatch on the existing connector without calling update()', async () => {
      const actionsClient = makeActionsClient();
      actionsClient.get.mockResolvedValueOnce({
        id: 'target-id',
        actionTypeId: '.some_other_connector',
      } as never);

      await expect(
        upsertConnector({
          actionsClient,
          mode: 'upsert',
          targetConnectorId: 'target-id',
          ...baseParams,
        })
      ).rejects.toThrow(/is of type \.some_other_connector, not \.fake_connector/);

      expect(actionsClient.update).not.toHaveBeenCalled();
      expect(actionsClient.create).not.toHaveBeenCalled();
    });

    it('sanitizes an update() failure into a generic, value-free error (guarantee 4b)', async () => {
      const actionsClient = makeActionsClient();
      actionsClient.get.mockResolvedValue({
        id: 'target-id',
        actionTypeId: '.fake_connector',
      } as never);
      actionsClient.update.mockRejectedValue(new Error(`validation failed: ${CANARY}`));

      await expect(
        upsertConnector({
          actionsClient,
          mode: 'upsert',
          targetConnectorId: 'target-id',
          ...baseParams,
        })
      ).rejects.toThrow(/rejected the provided configuration/);

      try {
        await upsertConnector({
          actionsClient,
          mode: 'upsert',
          targetConnectorId: 'target-id',
          ...baseParams,
        });
        throw new Error('expected upsertConnector to throw');
      } catch (error) {
        expect((error as Error).message).not.toContain(CANARY);
      }
    });

    it('propagates a concurrency-induced 409 on the fallback create() unmodified', async () => {
      const actionsClient = makeActionsClient();
      actionsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError('action', 'target-id')
      );
      const conflict = Boom.conflict(`race: ${CANARY}`);
      actionsClient.create.mockRejectedValueOnce(conflict);

      await expect(
        upsertConnector({
          actionsClient,
          mode: 'upsert',
          targetConnectorId: 'target-id',
          ...baseParams,
        })
      ).rejects.toBe(conflict);
    });

    it('propagates an unexpected get() failure (not a not-found error) unmodified', async () => {
      const actionsClient = makeActionsClient();
      const forbidden = Boom.forbidden('no access');
      actionsClient.get.mockRejectedValueOnce(forbidden);

      await expect(
        upsertConnector({
          actionsClient,
          mode: 'upsert',
          targetConnectorId: 'target-id',
          ...baseParams,
        })
      ).rejects.toBe(forbidden);
    });
  });
});
