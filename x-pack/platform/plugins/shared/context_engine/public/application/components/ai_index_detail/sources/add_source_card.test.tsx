/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import { AddSourceCard } from './add_source_card';

const renderWithProviders = (ui: React.ReactElement) => render(<EuiProvider>{ui}</EuiProvider>);

describe('AddSourceCard', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls onClick when the card is clicked', () => {
    const onClick = jest.fn();

    renderWithProviders(
      <AddSourceCard
        title="Elasticsearch data"
        description="Index or ES|QL"
        onClick={onClick}
        data-test-subj="contextAddElasticsearchDataCard"
      />
    );

    fireEvent.click(screen.getByTestId('contextAddElasticsearchDataCard'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('spreads ebtProps onto the card as data attributes', () => {
    const ebtProps = getEbtProps({
      element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageSourcesPanel,
      action: CONTEXT_ENGINE_UI_EBT.action.sources.CREATE_CONNECTOR,
    });

    renderWithProviders(
      <AddSourceCard
        title="Connectors"
        description="Third-party connectors"
        onClick={jest.fn()}
        data-test-subj="contextAddConnectorsCard"
        ebtProps={ebtProps}
      />
    );

    const card = screen.getByTestId('contextAddConnectorsCard');
    expect(card).toHaveAttribute('data-ebt-element', ebtProps['data-ebt-element']);
    expect(card).toHaveAttribute('data-ebt-action', ebtProps['data-ebt-action']);
  });
});
