/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { createStaticIndexPattern } from './create_static_index_pattern';
import { Setup } from '../helpers/setup_request';
import * as savedObjectsClient from '../helpers/saved_objects_client';
import * as HistoricalAgentData from '../services/get_services/has_historical_agent_data';

function getMockConfig(config: Record<string, unknown>) {
  return () => ({ get: (key: string) => config[key] });
}

describe('createStaticIndexPattern', () => {
  let createSavedObject: jest.Mock;
  beforeEach(() => {
    createSavedObject = jest.fn();
    jest
      .spyOn(savedObjectsClient, 'getInternalSavedObjectsClient')
      .mockReturnValue({
        create: createSavedObject
      } as any);
  });

  it(`should not create index pattern if 'xpack.apm.autocreateApmIndexPattern=false'`, async () => {
    const setup = {} as Setup;
    const server = {
      config: getMockConfig({
        'xpack.apm.autocreateApmIndexPattern': false
      })
    } as Server;
    await createStaticIndexPattern(setup, server);

    expect(createSavedObject).not.toHaveBeenCalled();
  });

  it(`should not create index pattern if no APM data is found`, async () => {
    const setup = {} as Setup;
    const server = {
      config: getMockConfig({
        'xpack.apm.autocreateApmIndexPattern': true
      })
    } as Server;

    // does not have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(false);

    await createStaticIndexPattern(setup, server);
    expect(createSavedObject).not.toHaveBeenCalled();
  });

  it(`should create index pattern`, async () => {
    const setup = {} as Setup;
    const server = {
      config: getMockConfig({
        'xpack.apm.autocreateApmIndexPattern': true
      })
    } as Server;

    // does have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(true);
    await createStaticIndexPattern(setup, server);

    expect(createSavedObject).toHaveBeenCalled();
  });
});
