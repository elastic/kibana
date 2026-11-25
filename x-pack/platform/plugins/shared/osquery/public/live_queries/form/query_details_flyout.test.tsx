/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiFlyout, EuiProvider, getFlyoutManagerStore } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { noop } from 'lodash';

import { QueryDetailsFlyout } from './query_details_flyout';

// Kibana's Jest resolver uses EUI's test-env flyout stub, which omits session management.
jest.mock('@elastic/eui', () =>
  jest.requireActual(
    require.resolve('@elastic/eui/package.json').replace('package.json', 'lib/index.js')
  )
);

const action = { id: 'action-1', query: 'select * from uptime;' };

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">{ui}</IntlProvider>
    </EuiProvider>
  );

const expectDetailsShown = () => {
  expect(screen.getByTestId('osquery-query-details-flyout')).toBeInTheDocument();
  expect(screen.getByText('Query Details')).toBeVisible();
  expect(screen.getByText('action-1')).toBeVisible();
  // the SQL block is syntax highlighted, so the text is split across spans
  expect(screen.getByTestId('osquery-query-details-flyout')).toHaveTextContent(action.query);
};

const validationErrors = (spy: jest.SpyInstance) =>
  spy.mock.calls.filter((args: Parameters<typeof console.error>) =>
    args.some((arg) => String(arg?.message ?? arg).includes('EuiFlyout validation error'))
  );

describe('QueryDetailsFlyout', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error');
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders inside a managed size m parent flyout without throwing', () => {
    renderWithProviders(
      <EuiFlyout session="start" size="m" aria-label="parent" onClose={noop}>
        <QueryDetailsFlyout action={action} onClose={jest.fn()} />
      </EuiFlyout>
    );

    expectDetailsShown();
    expect(validationErrors(consoleErrorSpy)).toHaveLength(0);
    expect(getFlyoutManagerStore().getState().flyouts).toEqual(
      expect.arrayContaining([expect.objectContaining({ level: 'child', size: 's' })])
    );
  });

  it('renders standalone size m outside a managed session', () => {
    renderWithProviders(<QueryDetailsFlyout action={action} onClose={jest.fn()} />);

    expectDetailsShown();
    expect(getFlyoutManagerStore().getState().flyouts).toHaveLength(0);
    // size m, not the narrower nested size s: EUI encodes the size in the emotion class name
    const { className } = screen.getByTestId('osquery-query-details-flyout');
    expect(className).toMatch(/-m-/);
    expect(className).not.toMatch(/-s-/);
  });

  it('close button calls onClose once', () => {
    const onClose = jest.fn();
    const onParentClose = jest.fn();
    renderWithProviders(
      <EuiFlyout session="start" size="m" aria-label="parent" onClose={onParentClose}>
        <div data-test-subj="parent-content">parent</div>
        <QueryDetailsFlyout action={action} onClose={onClose} />
      </EuiFlyout>
    );

    const details = screen.getByTestId('osquery-query-details-flyout');
    fireEvent.click(within(details).getByTestId('euiFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('parent-content')).toBeInTheDocument();
    expect(onParentClose).not.toHaveBeenCalled();
  });

  it('Escape calls onClose once', () => {
    const onClose = jest.fn();
    const onParentClose = jest.fn();
    renderWithProviders(
      <EuiFlyout session="start" size="m" aria-label="parent" onClose={onParentClose}>
        <div data-test-subj="parent-content">parent</div>
        <QueryDetailsFlyout action={action} onClose={onClose} />
      </EuiFlyout>
    );

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('parent-content')).toBeInTheDocument();
    expect(onParentClose).not.toHaveBeenCalled();
  });

  it('stays standalone when an unrelated managed session is active', () => {
    renderWithProviders(
      <>
        <EuiFlyout session="start" size="m" aria-label="other" onClose={noop}>
          other
        </EuiFlyout>
        <QueryDetailsFlyout action={action} onClose={jest.fn()} />
      </>
    );

    expect(getFlyoutManagerStore().getState().flyouts).toHaveLength(1);
    expectDetailsShown();
    expect(validationErrors(consoleErrorSpy)).toHaveLength(0);
  });

  it('does not throw inside an unmanaged parent while a session is active', () => {
    renderWithProviders(
      <>
        <EuiFlyout session="start" size="m" aria-label="other" onClose={noop}>
          other
        </EuiFlyout>
        <EuiFlyout session="never" size="m" aria-label="unmanaged" onClose={noop}>
          <QueryDetailsFlyout action={action} onClose={jest.fn()} />
        </EuiFlyout>
      </>
    );

    expectDetailsShown();
    expect(validationErrors(consoleErrorSpy)).toHaveLength(0);
    // an unmanaged parent keeps the details flyout standalone: only the sibling session is registered
    const { flyouts } = getFlyoutManagerStore().getState();
    expect(flyouts).toHaveLength(1);
    expect(flyouts).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ level: 'child' })])
    );
  });
});
