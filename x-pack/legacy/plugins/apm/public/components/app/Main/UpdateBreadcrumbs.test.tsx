/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { UpdateBreadcrumbs } from './UpdateBreadcrumbs';
import * as kibanaCore from '../../../../../observability/public/context/kibana_core';
import { LegacyCoreStart } from 'kibana/public';

const coreMock = ({
  chrome: {
    setBreadcrumbs: () => {}
  }
} as unknown) as LegacyCoreStart;

jest.spyOn(kibanaCore, 'useKibanaCore').mockReturnValue(coreMock);
const setBreadcrumbs = jest.spyOn(coreMock.chrome, 'setBreadcrumbs');

function expectBreadcrumbToMatchSnapshot(route: string, params = '') {
  mount(
    <MemoryRouter initialEntries={[`${route}?kuery=myKuery&${params}`]}>
      <UpdateBreadcrumbs />
    </MemoryRouter>
  );
  expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
  expect(setBreadcrumbs.mock.calls[0][0]).toMatchSnapshot();
}

describe('UpdateBreadcrumbs', () => {
  let originalTitle: string;

  beforeEach(() => {
    originalTitle = window.document.title;
    window.document.title = 'Kibana';
    setBreadcrumbs.mockReset();
  });

  afterEach(() => {
    window.document.title = originalTitle;
  });

  it('Homepage', () => {
    expectBreadcrumbToMatchSnapshot('/');
    expect(window.document.title).toMatchInlineSnapshot(`"APM"`);
  });

  it('/services/:serviceName/errors/:groupId', () => {
    expectBreadcrumbToMatchSnapshot('/services/opbeans-node/errors/myGroupId');
    expect(window.document.title).toMatchInlineSnapshot(
      `"myGroupId | Errors | opbeans-node | Services | APM"`
    );
  });

  it('/services/:serviceName/errors', () => {
    expectBreadcrumbToMatchSnapshot('/services/opbeans-node/errors');
    expect(window.document.title).toMatchInlineSnapshot(
      `"Errors | opbeans-node | Services | APM"`
    );
  });

  it('/services/:serviceName/transactions', () => {
    expectBreadcrumbToMatchSnapshot('/services/opbeans-node/transactions');
    expect(window.document.title).toMatchInlineSnapshot(
      `"Transactions | opbeans-node | Services | APM"`
    );
  });

  it('/services/:serviceName/transactions/view?transactionName=my-transaction-name', () => {
    expectBreadcrumbToMatchSnapshot(
      '/services/opbeans-node/transactions/view',
      'transactionName=my-transaction-name'
    );
    expect(window.document.title).toMatchInlineSnapshot(
      `"my-transaction-name | Transactions | opbeans-node | Services | APM"`
    );
  });
});
