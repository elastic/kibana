/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ModelEolCallout } from './model_eol_callout';

const renderCallout = (eolDate = '11/24/2026') =>
  render(
    <I18nProvider>
      <ModelEolCallout eolDate={eolDate} />
    </I18nProvider>
  );

describe('ModelEolCallout', () => {
  it('shows the title and View details when collapsed', () => {
    const { getByTestId, queryByTestId } = renderCallout();

    const callout = getByTestId('modelDetailFlyoutEolCallout');
    expect(callout).toHaveTextContent('Model not available for use');
    expect(getByTestId('modelDetailFlyoutEolViewDetailsButton')).toHaveTextContent('View details');
    expect(queryByTestId('modelDetailFlyoutEolHideDetailsButton')).not.toBeInTheDocument();
    expect(queryByTestId('modelDetailFlyoutEolDescription')).not.toBeInTheDocument();
  });

  it('expands the end-of-life description and shows Hide details', () => {
    const { getByTestId, queryByTestId } = renderCallout();

    fireEvent.click(getByTestId('modelDetailFlyoutEolViewDetailsButton'));

    expect(getByTestId('modelDetailFlyoutEolDescription')).toHaveTextContent(
      'End-of-life (11/24/2026). This model is retired and its endpoints will fail. Migrate to a supported model.'
    );
    expect(getByTestId('modelDetailFlyoutEolHideDetailsButton')).toHaveTextContent('Hide details');
    expect(queryByTestId('modelDetailFlyoutEolViewDetailsButton')).not.toBeInTheDocument();
  });

  it('collapses details after Hide details', () => {
    const { getByTestId, queryByTestId } = renderCallout();

    fireEvent.click(getByTestId('modelDetailFlyoutEolViewDetailsButton'));
    fireEvent.click(getByTestId('modelDetailFlyoutEolHideDetailsButton'));

    expect(getByTestId('modelDetailFlyoutEolViewDetailsButton')).toBeInTheDocument();
    expect(queryByTestId('modelDetailFlyoutEolHideDetailsButton')).not.toBeInTheDocument();
    expect(queryByTestId('modelDetailFlyoutEolDescription')).not.toBeInTheDocument();
  });
});
