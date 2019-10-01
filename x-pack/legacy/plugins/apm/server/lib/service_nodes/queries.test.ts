/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getServiceNodes } from './';
import {
  SearchParamsMock,
  inspectSearchParams
} from '../../../public/utils/testHelpers';

describe('service node queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches services nodes', async () => {
    mock = await inspectSearchParams(setup =>
      getServiceNodes({ setup, serviceName: 'foo' })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches jvms with sortField and sortDirection defined', async () => {
    mock = await inspectSearchParams(setup =>
      getServiceNodes({
        setup,
        serviceName: 'foo',
        sortField: 'foo',
        sortDirection: 'desc'
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
