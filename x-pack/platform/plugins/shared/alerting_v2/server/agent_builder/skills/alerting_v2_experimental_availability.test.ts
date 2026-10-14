/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/alerting-v2-constants';
import { createAlertingV2Availability } from './alerting_v2_experimental_availability';

const createContext = (experimentalFeaturesEnabled = true) => {
  const uiSettings = { get: jest.fn().mockResolvedValue(experimentalFeaturesEnabled) };

  return {
    context: { request: {}, uiSettings, spaceId: 'default' } as never,
    uiSettings,
  };
};

describe('createAlertingV2Availability', () => {
  it('is unavailable before resolving project or space when the experimental gate is disabled', async () => {
    const getActiveSpace = jest.fn();
    const availability = createAlertingV2Availability({
      getActiveSpace,
      projectType: 'security',
    });
    const { context, uiSettings } = createContext(false);

    await expect(availability.handler(context)).resolves.toEqual({ status: 'unavailable' });
    expect(uiSettings.get).toHaveBeenCalledWith(ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID);
    expect(getActiveSpace).not.toHaveBeenCalled();
  });

  it.each(['security', 'search'] as const)(
    'is unavailable in a %s serverless project',
    async (projectType) => {
      const getActiveSpace = jest.fn();
      const availability = createAlertingV2Availability({ getActiveSpace, projectType });

      await expect(availability.handler(createContext().context)).resolves.toEqual({
        status: 'unavailable',
        reason: 'Alerting v2 skills are only available in Observability projects',
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
        reason: 'Alerting v2 skills are only available in Observability or Classic spaces',
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
