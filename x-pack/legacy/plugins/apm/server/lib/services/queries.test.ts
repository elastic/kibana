/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getServiceAgentName } from './get_service_agent_name';
import { getServiceTransactionTypes } from './get_service_transaction_types';
import { getServicesItems } from './get_services/get_services_items';
import { getLegacyDataStatus } from './get_services/get_legacy_data_status';
import { getAgentStatus } from './get_services/get_agent_status';
import {
  SearchParamsMock,
  inspectSearchParams
} from '../../../public/utils/testHelpers';

describe('services queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches the service agent name', async () => {
    mock = await inspectSearchParams(setup =>
      getServiceAgentName('foo', setup)
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches the service transaction types', async () => {
    mock = await inspectSearchParams(setup =>
      getServiceTransactionTypes('foo', setup)
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches the service items', async () => {
    mock = await inspectSearchParams(setup => getServicesItems(setup));

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches the legacy data status', async () => {
    mock = await inspectSearchParams(setup => getLegacyDataStatus(setup));

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches the agent status', async () => {
    mock = await inspectSearchParams(setup => getAgentStatus(setup));

    expect(mock.params).toMatchSnapshot();
  });
});
