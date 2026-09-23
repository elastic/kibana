/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, uiSettingsServiceMock } from '@kbn/core/server/mocks';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { createNightshiftEnabledAvailability } from './sandbox_tool_availability';

const context = {
  request: httpServerMock.createKibanaRequest(),
  uiSettings: uiSettingsServiceMock.createClient(),
  spaceId: 'default',
};

describe('createNightshiftEnabledAvailability', () => {
  it.each([
    [true, 'available'],
    [false, 'unavailable'],
  ])('reports the tool as %p → %s', async (enabled, status) => {
    const { featureFlags } = coreMock.createStart();
    featureFlags.getBooleanValue.mockResolvedValue(enabled);

    const { handler } = createNightshiftEnabledAvailability(() => featureFlags);

    await expect(handler(context)).resolves.toEqual(expect.objectContaining({ status }));
    expect(featureFlags.getBooleanValue).toHaveBeenCalledWith(NIGHTSHIFT_ENABLED_FLAG, false);
  });

  it('reports the tool as unavailable before start', async () => {
    const { handler } = createNightshiftEnabledAvailability(() => undefined);

    await expect(handler(context)).resolves.toEqual(
      expect.objectContaining({ status: 'unavailable' })
    );
  });
});
