/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAllEnvironments } from './get_environments/get_all_environments';
import { getExistingEnvironmentsForService } from './get_environments/get_existing_environments_for_service';
import { getServiceNames } from './get_service_names';
import { listConfigurations } from './list_configurations';
import { searchConfigurations } from './search';
import {
  SearchParamsMock,
  inspectSearchParams
} from '../../../../public/utils/testHelpers';

describe('agent configuration queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches all environments', async () => {
    mock = await inspectSearchParams(setup =>
      getAllEnvironments({
        serviceName: 'foo',
        setup
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches unavailable environments', async () => {
    mock = await inspectSearchParams(setup =>
      getExistingEnvironmentsForService({
        serviceName: 'foo',
        setup
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches service names', async () => {
    mock = await inspectSearchParams(setup =>
      getServiceNames({
        setup
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches configurations', async () => {
    mock = await inspectSearchParams(setup =>
      listConfigurations({
        setup
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches filtered configurations without an environment', async () => {
    mock = await inspectSearchParams(setup =>
      searchConfigurations({
        serviceName: 'foo',
        setup
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches filtered configurations with an environment', async () => {
    mock = await inspectSearchParams(setup =>
      searchConfigurations({
        serviceName: 'foo',
        environment: 'bar',
        setup
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
