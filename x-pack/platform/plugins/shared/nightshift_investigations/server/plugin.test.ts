/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type {
  InvestigationQuotaCallback,
  NightshiftInvestigationsSetupDeps,
  NightshiftInvestigationsStartDeps,
} from './types';
import { NightshiftInvestigationsPlugin } from './plugin';
import { SavedObjectInvestigationSweepRepository } from './storage';

const createPlugin = () => {
  const context = coreMock.createPluginInitializerContext({
    enabled: true,
    sandbox: undefined,
    cortex: { enabled: false },
    decision_trees: { enabled: true },
  });
  return {
    logger: context.logger.get(),
    plugin: new NightshiftInvestigationsPlugin(context),
  };
};

const createSetupDeps = () =>
  ({
    taskManager: {
      registerTaskDefinitions: jest.fn(),
    },
  } as unknown as NightshiftInvestigationsSetupDeps);

const createStartDeps = () => ({ taskManager: {} } as unknown as NightshiftInvestigationsStartDeps);

describe('NightshiftInvestigationsPlugin setup', () => {
  it('accepts one investigation quota callback', () => {
    const setup = createPlugin().plugin.setup(coreMock.createSetup(), createSetupDeps());
    const callback: InvestigationQuotaCallback = jest.fn().mockResolvedValue({ allowed: true });

    expect(() => setup.registerInvestigationQuota(callback)).not.toThrow();
  });

  it('rejects a second investigation quota callback registration', () => {
    const setup = createPlugin().plugin.setup(coreMock.createSetup(), createSetupDeps());
    const callback: InvestigationQuotaCallback = jest.fn().mockResolvedValue({ allowed: true });

    setup.registerInvestigationQuota(callback);

    expect(() => setup.registerInvestigationQuota(callback)).toThrow(
      'Investigation quota callback is already registered'
    );
  });
});

describe('NightshiftInvestigationsPlugin start', () => {
  afterEach(() => jest.restoreAllMocks());

  it('logs cross-space deletion results and failures', async () => {
    jest
      .spyOn(SavedObjectInvestigationSweepRepository.prototype, 'deleteAllAcrossSpaces')
      .mockResolvedValue({
        deleted: 2,
        failures: [{ id: 'inv-3', spaceId: 'team-a', error: 'delete failed' }],
      });
    const { plugin, logger } = createPlugin();
    const start = plugin.start(coreMock.createStart(), createStartDeps());

    await expect(start.deleteAllInvestigations()).resolves.toEqual({
      deleted: 2,
      failures: [{ id: 'inv-3', spaceId: 'team-a', error: 'delete failed' }],
    });
    expect(logger.info).toHaveBeenCalledWith(
      'Deleted 2 investigation(s) across all spaces with 1 failure(s)'
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to delete investigation "inv-3" in space "team-a": delete failed'
    );
  });

  it('logs and rethrows an unexpected cross-space deletion error', async () => {
    jest
      .spyOn(SavedObjectInvestigationSweepRepository.prototype, 'deleteAllAcrossSpaces')
      .mockRejectedValue(new Error('point in time failed'));
    const { plugin, logger } = createPlugin();
    const start = plugin.start(coreMock.createStart(), createStartDeps());

    await expect(start.deleteAllInvestigations()).rejects.toThrow('point in time failed');
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to delete investigations across all spaces: point in time failed'
    );
  });
});
