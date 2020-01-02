/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { UpdateBreadcrumbs } from '../UpdateBreadcrumbs';
import * as kibanaCore from '../../../../../../observability/public/context/kibana_core';
import { getRoutes } from '../route_config';

const coreMock = {
  chrome: {
    setBreadcrumbs: jest.fn()
  }
};

jest.spyOn(kibanaCore, 'useKibanaCore').mockReturnValue(coreMock);

const routes = getRoutes({ serviceMapEnabled: true });

function expectBreadcrumbToMatchSnapshot(route, params = '') {
  mount(
    <MemoryRouter initialEntries={[`${route}?kuery=myKuery&${params}`]}>
      <UpdateBreadcrumbs routes={routes} />
    </MemoryRouter>
  );
  expect(coreMock.chrome.setBreadcrumbs).toHaveBeenCalledTimes(1);
  expect(coreMock.chrome.setBreadcrumbs.mock.calls[0][0]).toMatchSnapshot();
}

describe('UpdateBreadcrumbs', () => {
  let realDoc;

  beforeEach(() => {
    realDoc = global.document;
    global.document = {
      title: 'Kibana'
    };
    coreMock.chrome.setBreadcrumbs.mockReset();
  });

  afterEach(() => {
    global.document = realDoc;
  });

  it('Homepage', () => {
    expectBreadcrumbToMatchSnapshot('/');
    expect(global.document.title).toMatchInlineSnapshot(`"APM"`);
  });

  it('/services/:serviceName/errors/:groupId', () => {
    expectBreadcrumbToMatchSnapshot('/services/opbeans-node/errors/myGroupId');
    expect(global.document.title).toMatchInlineSnapshot(
      `"myGroupId | Errors | opbeans-node | Services | APM"`
    );
  });

  it('/services/:serviceName/errors', () => {
    expectBreadcrumbToMatchSnapshot('/services/opbeans-node/errors');
    expect(global.document.title).toMatchInlineSnapshot(
      `"Errors | opbeans-node | Services | APM"`
    );
  });

  it('/services/:serviceName/transactions', () => {
    expectBreadcrumbToMatchSnapshot('/services/opbeans-node/transactions');
    expect(global.document.title).toMatchInlineSnapshot(
      `"Transactions | opbeans-node | Services | APM"`
    );
  });

  it('/services/:serviceName/transactions/view?transactionName=my-transaction-name', () => {
    expectBreadcrumbToMatchSnapshot(
      '/services/opbeans-node/transactions/view',
      'transactionName=my-transaction-name'
    );
    expect(global.document.title).toMatchInlineSnapshot(
      `"my-transaction-name | Transactions | opbeans-node | Services | APM"`
    );
  });
});
