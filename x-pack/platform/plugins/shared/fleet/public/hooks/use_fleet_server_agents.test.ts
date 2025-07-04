/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendGetAllFleetServerAgents } from './use_fleet_server_agents';
import { sendGetAgents, sendGetPackagePolicies } from './use_request';

jest.mock('./use_request', () => ({
  sendGetAgents: jest.fn(),
  sendGetPackagePolicies: jest.fn(),
}));

describe('sendGetAllFleetServerAgents', () => {
  beforeEach(() => {
    (sendGetPackagePolicies as jest.Mock).mockResolvedValue({
      data: {
        items: [{ policy_id: '1' }],
      },
    });
  });
  it('should return all fleet server agents', async () => {
    (sendGetAgents as jest.Mock).mockResolvedValue({
      data: {
        items: [{ id: '1' }],
        total: 1,
      },
    });

    const result = await sendGetAllFleetServerAgents();

    expect(result).toEqual({ fleetServerAgentsCount: 1, allFleetServerAgents: [{ id: '1' }] });
  });

  it('should return only total count', async () => {
    (sendGetAgents as jest.Mock).mockResolvedValue({
      data: {
        items: [],
        total: 1,
      },
    });

    const result = await sendGetAllFleetServerAgents(true);

    expect(result).toEqual({ fleetServerAgentsCount: 1, allFleetServerAgents: [] });
  });
});
