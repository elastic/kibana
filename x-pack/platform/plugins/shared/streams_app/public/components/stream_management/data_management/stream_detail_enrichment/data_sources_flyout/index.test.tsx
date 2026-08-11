/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { DataSourcesFlyout } from '.';
import { DATA_SOURCES_I18N } from './translations';

// The flyout only needs the list of data source refs from the enrichment machine.
jest.mock('../state_management/stream_enrichment_state_machine', () => ({
  useStreamEnrichmentSelector: jest.fn((selector) =>
    selector({ context: { dataSourcesRefs: [] } })
  ),
}));

// Keep the assertion focused on the flyout container's accessible name.
jest.mock('./add_data_sources_context_menu', () => ({
  AddDataSourcesContextMenu: () => null,
}));

jest.mock('./data_source_card', () => ({
  PartialSimulationBadge: () => <span>partial</span>,
  CompleteSimulationBadge: () => <span>complete</span>,
}));

// Kibana's jest preset maps `@elastic/eui` to a lightweight test-env mock whose
// `EuiFlyout` does not forward `aria-labelledby`. Override `EuiFlyoutResizable` so
// the attribute reaches the `role="dialog"` container, allowing us to assert that
// this component wires the dialog's accessible name to its visible title.
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiFlyoutResizable: ({
      children,
      'aria-labelledby': ariaLabelledBy,
    }: {
      children: React.ReactNode;
      'aria-labelledby'?: string;
    }) => (
      <div role="dialog" aria-labelledby={ariaLabelledBy}>
        {children}
      </div>
    ),
  };
});

const renderFlyout = () =>
  render(
    <IntlProvider locale="en">
      <DataSourcesFlyout onClose={jest.fn()} />
    </IntlProvider>
  );

describe('DataSourcesFlyout', () => {
  it('names the flyout dialog via its visible title so assistive technology announces it', () => {
    renderFlyout();

    // Without an accessible name the dialog is announced only as "modal dialog".
    // The visible title heading must be wired to the dialog via aria-labelledby.
    expect(
      screen.getByRole('dialog', { name: DATA_SOURCES_I18N.flyout.title })
    ).toBeInTheDocument();
  });
});
