/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import chrome from 'ui/chrome';
import { UpdateBreadcrumbs } from '../UpdateBreadcrumbs';

jest.mock('ui/kfetch');

jest.mock(
  'ui/chrome',
  () => ({
    breadcrumbs: {
      set: jest.fn()
    },
    getBasePath: () => `/some/base/path`,
    getUiSettingsClient: () => {
      return {
        get: key => {
          switch (key) {
            case 'timepicker:timeDefaults':
              return { from: 'now-15m', to: 'now', mode: 'quick' };
            case 'timepicker:refreshIntervalDefaults':
              return { pause: false, value: 0 };
            default:
              throw new Error(`Unexpected config key: ${key}`);
          }
        }
      };
    }
  }),
  { virtual: true }
);

function expectBreadcrumbToMatchSnapshot(route) {
  mount(
    <MemoryRouter initialEntries={[`${route}?kuery=myKuery`]}>
      <UpdateBreadcrumbs />
    </MemoryRouter>
  );
  expect(chrome.breadcrumbs.set).toHaveBeenCalledTimes(1);
  expect(chrome.breadcrumbs.set.mock.calls[0][0]).toMatchSnapshot();
}

describe('Breadcrumbs', () => {
  let realDoc;

  beforeEach(() => {
    realDoc = global.document;
    global.document = {
      title: 'Kibana'
    };
    chrome.breadcrumbs.set.mockReset();
  });

  afterEach(() => {
    global.document = realDoc;
  });

  it('Homepage', () => {
    expectBreadcrumbToMatchSnapshot('/');
    expect(global.document.title).toMatchInlineSnapshot(`"APM"`);
  });

  it('/:serviceName/errors/:groupId', () => {
    expectBreadcrumbToMatchSnapshot('/opbeans-node/errors/myGroupId');
    expect(global.document.title).toMatchInlineSnapshot(`"myGroupId"`);
  });

  it('/:serviceName/errors', () => {
    expectBreadcrumbToMatchSnapshot('/opbeans-node/errors');
    expect(global.document.title).toMatchInlineSnapshot(`"Errors"`);
  });

  it('/:serviceName', () => {
    expectBreadcrumbToMatchSnapshot('/opbeans-node');
    expect(global.document.title).toMatchInlineSnapshot(`"opbeans-node"`);
  });

  it('/:serviceName/transactions', () => {
    expectBreadcrumbToMatchSnapshot('/opbeans-node/transactions');
    expect(global.document.title).toMatchInlineSnapshot(`"Transactions"`);
  });

  it('/:serviceName/transactions/:transactionType', () => {
    expectBreadcrumbToMatchSnapshot('/opbeans-node/transactions/request');
    expect(global.document.title).toMatchInlineSnapshot(`"Transactions"`);
  });

  it('/:serviceName/transactions/:transactionType/:transactionName', () => {
    expectBreadcrumbToMatchSnapshot(
      '/opbeans-node/transactions/request/my-transaction-name'
    );
    expect(global.document.title).toMatchInlineSnapshot(
      `"my-transaction-name"`
    );
  });
});
