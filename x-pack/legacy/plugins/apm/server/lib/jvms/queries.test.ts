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

import { getJvms } from './';
import {
  SearchParamsMock,
  inspectSearchParams
} from '../../../public/utils/testHelpers';

describe('metrics queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches jvms', async () => {
    mock = await inspectSearchParams(setup =>
      getJvms({ setup, serviceName: 'foo' })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches jvms with sortField and sortDirection defined', async () => {
    mock = await inspectSearchParams(setup =>
      getJvms({
        setup,
        serviceName: 'foo',
        sortField: 'foo',
        sortDirection: 'desc'
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
