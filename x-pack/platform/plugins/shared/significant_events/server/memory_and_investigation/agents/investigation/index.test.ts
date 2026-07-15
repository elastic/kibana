/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { getSignificantEventsAvailability } from '../../../routes/utils/assert_significant_events_access';
import { createInvestigationAgent } from '.';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  getSignificantEventsAvailability: jest.fn(),
}));

describe('createInvestigationAgent', () => {
  const server = {
    licensing: {},
  } as unknown as StreamsServer;

  it('availability returns available when significant events is available', async () => {
    (getSignificantEventsAvailability as jest.Mock).mockResolvedValueOnce({ available: true });

    const agent = createInvestigationAgent({ server });
    const result = await agent.availability!.handler({} as never);

    expect(result).toEqual({ status: 'available' });
    expect(getSignificantEventsAvailability).toHaveBeenCalledWith({
      server,
      licensing: server.licensing,
    });
  });

  it('availability returns unavailable with the reason when significant events is unavailable', async () => {
    (getSignificantEventsAvailability as jest.Mock).mockResolvedValueOnce({
      available: false,
      reason: 'feature_flag',
    });

    const agent = createInvestigationAgent({ server });
    const result = await agent.availability!.handler({} as never);

    expect(result).toEqual({ status: 'unavailable', reason: 'feature_flag' });
  });
});
