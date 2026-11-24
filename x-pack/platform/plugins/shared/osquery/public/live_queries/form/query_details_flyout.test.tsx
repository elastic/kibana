/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiFlyout, EuiProvider } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { noop } from 'lodash';

import { QueryDetailsFlyout } from './query_details_flyout';

// Kibana's Jest resolver uses EUI's test-env flyout stub, which omits session management.
jest.mock('@elastic/eui', () =>
  jest.requireActual(
    require.resolve('@elastic/eui/package.json').replace('package.json', 'lib/index.js')
  )
);

describe('QueryDetailsFlyout', () => {
  it('renders inside a managed size m parent flyout without throwing', () => {
    render(
      <EuiProvider>
        <IntlProvider locale="en">
          <EuiFlyout session="start" size="m" aria-label="parent" onClose={noop}>
            <QueryDetailsFlyout
              action={{ id: 'action-1', query: 'select * from uptime;' }}
              onClose={jest.fn()}
            />
          </EuiFlyout>
        </IntlProvider>
      </EuiProvider>
    );

    expect(screen.getByText('Query Details')).toBeVisible();
    expect(screen.getByText('action-1')).toBeVisible();
    expect(screen.getByText('select * from uptime;')).toBeVisible();
  });
});
