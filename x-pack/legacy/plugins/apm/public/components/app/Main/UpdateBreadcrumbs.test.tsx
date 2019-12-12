/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { UpdateBreadcrumbs } from './UpdateBreadcrumbs';
import { getRoutes } from './route_config';
import {
  MockApmPluginContextWrapper,
  mockApmPluginContextValue
} from '../../../utils/testHelpers';
import { ApmPluginContextValue } from '../../../context/ApmPluginContext';

const routes = getRoutes({ serviceMapEnabled: true });
const setBreadcrumbs = jest.fn();

function expectBreadcrumbToMatchSnapshot(route: string, params = '') {
  mount(
    <MockApmPluginContextWrapper
      value={
        ({
          ...mockApmPluginContextValue,
          core: {
            ...mockApmPluginContextValue.core,
            chrome: {
              ...mockApmPluginContextValue.core.chrome,
              setBreadcrumbs
            }
          }
        } as unknown) as ApmPluginContextValue
      }
    >
      <MemoryRouter initialEntries={[`${route}?kuery=myKuery&${params}`]}>
        <UpdateBreadcrumbs routes={routes} />
      </MemoryRouter>
    </MockApmPluginContextWrapper>
  );
  expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
  expect(setBreadcrumbs.mock.calls[0][0]).toMatchSnapshot();
}

describe('UpdateBreadcrumbs', () => {
  let realDoc: Document;

  beforeEach(() => {
    realDoc = window.document;
    (window.document as any) = {
      title: 'Kibana'
    };
    setBreadcrumbs.mockReset();
  });

  afterEach(() => {
    (window.document as any) = realDoc;
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
