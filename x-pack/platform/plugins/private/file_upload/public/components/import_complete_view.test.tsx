/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen, act } from '@testing-library/react';
import 'jest-canvas-mock';
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

test('Should render success', async () => {
  await act(async () => {
    renderWithI18n(
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
  });

  expect(screen.getByText('File upload complete')).toBeInTheDocument();
  expect(screen.getByText('Indexed 10 features.')).toBeInTheDocument();
});

test('Should render warning when some features failed import', async () => {
  await act(async () => {
    renderWithI18n(
      <ImportCompleteView
        failedPermissionCheck={false}
        importResults={{
          success: true,
          docCount: 10,
          failures: [{ item: 1, reason: 'simulated feature import failure', doc: {} }],
        }}
        dataViewResp={{}}
        indexName="myIndex"
      />
    );
  });

  expect(screen.getByText('File upload complete with failures')).toBeInTheDocument();
  expect(screen.getByText(/unable to index 1 of 10 features/i)).toBeInTheDocument();
});

test('Should render error when upload fails from http request timeout', async () => {
  await act(async () => {
    renderWithI18n(
      <ImportCompleteView
        failedPermissionCheck={false}
        importResults={{
          success: false,
          docCount: 10,
          error: {
            body: { message: 'simulated http request timeout' },
          },
        }}
        indexName="myIndex"
      />
    );
  });

  expect(screen.getByText('Unable to upload file')).toBeInTheDocument();
  expect(screen.getByText('Error: simulated http request timeout')).toBeInTheDocument();
});

test('Should render error when upload fails from elasticsearch request failure', async () => {
  await act(async () => {
    renderWithI18n(
      <ImportCompleteView
        failedPermissionCheck={false}
        importResults={{
          success: false,
          docCount: 10,
          error: {
            error: { reason: 'simulated elasticsearch request failure' },
          },
        }}
        indexName="myIndex"
      />
    );
  });

  expect(screen.getByText('Unable to upload file')).toBeInTheDocument();
  expect(screen.getByText('Error: simulated elasticsearch request failure')).toBeInTheDocument();
});
