/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { SPACES_USAGE_STATS_TYPE } from './constants';
import { UsageStatsClient } from './usage_stats_client';
import { UsageStatsService } from './usage_stats_service';

describe('UsageStatsService', () => {
  const mockLogger = loggingSystemMock.createLogger();

  describe('#setup', () => {
    const setup = async () => {
      const core = coreMock.createSetup();
      const usageStatsService = await new UsageStatsService(mockLogger).setup(core);
      return { core, usageStatsService };
    };

    it('creates internal repository', async () => {
      const { core } = await setup();

      const [{ savedObjects }] = await core.getStartServices();
      expect(savedObjects.createInternalRepository).toHaveBeenCalledTimes(1);
      expect(savedObjects.createInternalRepository).toHaveBeenCalledWith([SPACES_USAGE_STATS_TYPE]);
    });

    describe('#getClient', () => {
      it('returns client', async () => {
        const { usageStatsService } = await setup();

        const usageStatsClient = usageStatsService.getClient();
        expect(usageStatsClient).toBeInstanceOf(UsageStatsClient);
      });
    });
  });
});
