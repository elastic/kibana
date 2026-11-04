/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAlertingV2Availability } from './alerting_v2_availability';

const createContext = () => {
  const uiSettings = { get: jest.fn() };

  return {
    context: { request: {}, uiSettings, spaceId: 'default' } as never,
    uiSettings,
  };
};

describe('createAlertingV2Availability', () => {
  it('does not consult universal alerting or Agent Builder experimental feature settings', async () => {
    const availability = createAlertingV2Availability({
      getActiveSpace: jest.fn().mockResolvedValue({}),
    });
    const { context, uiSettings } = createContext();

    await expect(availability.handler(context)).resolves.toEqual({ status: 'available' });
    expect(uiSettings.get).not.toHaveBeenCalled();
  });

  it.each(['security', 'search'] as const)(
    'is unavailable in a %s serverless project',
    async (projectType) => {
      const getActiveSpace = jest.fn();
      const availability = createAlertingV2Availability({ getActiveSpace, projectType });

      await expect(availability.handler(createContext().context)).resolves.toEqual({
        status: 'unavailable',
        reason: 'Universal alerting skills are only available in Observability projects',
      });
      expect(getActiveSpace).not.toHaveBeenCalled();
    }
  );

  it('is available in an Observability serverless project', async () => {
    const getActiveSpace = jest.fn().mockResolvedValue({});
    const availability = createAlertingV2Availability({
      getActiveSpace,
      projectType: 'observability',
    });

    await expect(availability.handler(createContext().context)).resolves.toEqual({
      status: 'available',
    });
  });

  it.each([undefined, 'classic', 'oblt'])(
    'is available in a stateful space with solution %s',
    async (solution) => {
      const availability = createAlertingV2Availability({
        getActiveSpace: jest.fn().mockResolvedValue({ solution }),
      });

      await expect(availability.handler(createContext().context)).resolves.toEqual({
        status: 'available',
      });
    }
  );

  it.each(['security', 'es'])(
    'is unavailable in a stateful space with solution %s',
    async (solution) => {
      const availability = createAlertingV2Availability({
        getActiveSpace: jest.fn().mockResolvedValue({ solution }),
      });

      await expect(availability.handler(createContext().context)).resolves.toEqual({
        status: 'unavailable',
        reason: 'Universal alerting skills are only available in Observability or Classic spaces',
      });
    }
  );

  it('preserves availability when the active space cannot be resolved', async () => {
    const availability = createAlertingV2Availability({
      getActiveSpace: jest.fn().mockRejectedValue(new Error('spaces unavailable')),
    });

    await expect(availability.handler(createContext().context)).resolves.toEqual({
      status: 'available',
    });
  });
});
