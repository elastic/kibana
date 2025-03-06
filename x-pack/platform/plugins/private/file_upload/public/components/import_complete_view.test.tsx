/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { ImportCompleteView } from './import_complete_view';

jest.mock('../kibana_services', () => ({
  get: jest.fn(),
  getDocLinks: () => {
    return {
      links: {
        maps: {
          importGeospatialPrivileges: 'linkToPrvilegesDocs',
        },
      },
    };
  },
  getHttp: () => {
    return {
      basePath: {
        prepend: (path: string) => `abc${path}`,
      },
    };
  },
  getUiSettings: () => {
    return {
      get: jest.fn(),
    };
  },
  getSettings: () => {
    return {
      get: jest.fn(),
    };
  },
  getTheme: () => {
    return {
      theme$: jest.fn(),
    };
  },
}));

test('Should render success', () => {
  const component = shallow(
    <ImportCompleteView
      failedPermissionCheck={false}
      importResults={{
        success: true,
        docCount: 10,
      }}
      dataViewResp={{}}
      indexName="myIndex"
    />
  );

  expect(component).toMatchSnapshot();
});

test('Should render warning when some features failed import', () => {
  const component = shallow(
    <ImportCompleteView
      failedPermissionCheck={false}
      importResults={{
        success: true,
        docCount: 10,
        failures: [
          {
            item: 1,
            reason: 'simulated feature import failure',
            doc: {},
          },
        ],
      }}
      dataViewResp={{}}
      indexName="myIndex"
    />
  );

  expect(component).toMatchSnapshot();
});

test('Should render error when upload fails from http request timeout', () => {
  const component = shallow(
    <ImportCompleteView
      failedPermissionCheck={false}
      importResults={{
        success: false,
        docCount: 10,
        error: {
          body: {
            message: 'simulated http request timeout',
          },
        },
      }}
      indexName="myIndex"
    />
  );

  expect(component).toMatchSnapshot();
});

test('Should render error when upload fails from elasticsearch request failure', () => {
  const component = shallow(
    <ImportCompleteView
      failedPermissionCheck={false}
      importResults={{
        success: false,
        docCount: 10,
        error: {
          error: {
            reason: 'simulated elasticsearch request failure',
          },
        },
      }}
      indexName="myIndex"
    />
  );

  expect(component).toMatchSnapshot();
});
