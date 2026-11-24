/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { EuiFlyout, EuiProvider, getFlyoutManagerStore } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { noop } from 'lodash';

import { AddTagsFlyout } from './add_tags_flyout';

// Kibana's Jest resolver uses EUI's test-env flyout stub, which omits session management.
jest.mock('@elastic/eui', () =>
  jest.requireActual(
    require.resolve('@elastic/eui/package.json').replace('package.json', 'lib/index.js')
  )
);

jest.mock('../use_history_tags', () => ({
  useHistoryTags: () => ({ tags: ['investigation'] }),
}));

jest.mock('../use_update_action_tags', () => ({
  useUpdateActionTags: () => ({ mutate: jest.fn(), isLoading: false }),
}));

// Guard only: the alert Response tool renders PackQueriesStatusTable without
// `showResultsHeader`, so this flyout is not reachable there today. It keeps the
// flyout nest-safe if a managed host ever renders the results header.
describe('AddTagsFlyout', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error');
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders inside a managed size m parent flyout without throwing', () => {
    render(
      <EuiProvider>
        <IntlProvider locale="en">
          <EuiFlyout session="start" size="m" aria-label="parent" onClose={noop}>
            <AddTagsFlyout actionId="action-1" currentTags={[]} onClose={jest.fn()} />
          </EuiFlyout>
        </IntlProvider>
      </EuiProvider>
    );

    const tagsComboBox = screen.getByTestId('add-tags-flyout-combo-box');
    expect(tagsComboBox).toBeVisible();
    expect(within(tagsComboBox).getByRole('combobox')).toBeVisible();
    expect(getFlyoutManagerStore().getState().flyouts).toEqual(
      expect.arrayContaining([expect.objectContaining({ level: 'child', size: 's' })])
    );
    expect(
      consoleErrorSpy.mock.calls.filter((args: Parameters<typeof console.error>) =>
        args.some((arg) => String(arg?.message ?? arg).includes('EuiFlyout validation error'))
      )
    ).toHaveLength(0);
  });
});
