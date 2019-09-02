/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getErrorDistribution } from './get_distribution';
import {
  SearchParamsMock,
  inspectSearchParams
} from '../../../../public/utils/testHelpers';

describe('error distribution queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches an error distribution', async () => {
    mock = await inspectSearchParams(setup =>
      getErrorDistribution({
        serviceName: 'serviceName',
        setup
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches an error distribution with a group id', async () => {
    mock = await inspectSearchParams(setup =>
      getErrorDistribution({
        serviceName: 'serviceName',
        groupId: 'foo',
        setup
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
