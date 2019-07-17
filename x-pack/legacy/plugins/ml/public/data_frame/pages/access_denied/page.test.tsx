/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { render, fireEvent, cleanup } from 'react-testing-library';

import { I18nProvider } from '@kbn/i18n/react';

import { Page } from './page';

// The mocks for ui/chrome and ui/timefilter are copied from charts_utils.test.js
// TODO: Refactor the involved tests to avoid this duplication
jest.mock(
  'ui/chrome',
  () => ({
    addBasePath: () => '/api/ml',
    getBasePath: () => {
      return '<basepath>';
    },
    getInjected: () => {},
    getUiSettingsClient: () => {
      return {
        get: (key: string) => {
          switch (key) {
            case 'dateFormat':
            case 'timepicker:timeDefaults':
              return {};
            case 'timepicker:refreshIntervalDefaults':
              return { pause: false, value: 0 };
            default:
              throw new Error(`Unexpected config key: ${key}`);
          }
        },
      };
    },
  }),
  { virtual: true }
);

jest.mock(
  'ui/persisted_log/recently_accessed',
  () => ({
    recentlyAccessed: {},
  }),
  { virtual: true }
);

afterEach(cleanup);

describe('Data Frame: Access denied <Page />', () => {
  test('Minimal initialization', () => {
    const props = {
      goToKibana: jest.fn(),
      retry: jest.fn(),
    };

    const tree = (
      <I18nProvider>
        <Page {...props} />
      </I18nProvider>
    );

    const { getByText } = render(tree);

    fireEvent.click(getByText(/Back to Kibana home/i));
    fireEvent.click(getByText(/Retry/i));

    expect(props.goToKibana).toHaveBeenCalledTimes(1);
    expect(props.retry).toHaveBeenCalledTimes(1);
  });
});
