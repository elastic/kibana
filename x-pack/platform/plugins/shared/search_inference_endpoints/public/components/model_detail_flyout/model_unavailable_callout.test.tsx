/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ModelUnavailableCallout } from './model_unavailable_callout';

const renderCallout = (onManageRegions?: () => void) =>
  render(
    <I18nProvider>
      <ModelUnavailableCallout onManageRegions={onManageRegions} />
    </I18nProvider>
  );

describe('ModelUnavailableCallout', () => {
  it('shows the title and View details when collapsed', () => {
    const { getByTestId, queryByTestId } = renderCallout();

    const callout = getByTestId('modelDetailFlyoutRegionUnavailableCallout');
    expect(callout).toHaveTextContent('Model not available for use');
    expect(getByTestId('modelDetailFlyoutViewDetailsButton')).toHaveTextContent('View details');
    expect(queryByTestId('modelDetailFlyoutHideDetailsButton')).not.toBeInTheDocument();
    expect(queryByTestId('modelDetailFlyoutEditRegionPreferencesButton')).not.toBeInTheDocument();
    expect(callout).not.toHaveTextContent('Blocked by your region policy');
  });

  it('expands details and shows Hide details', () => {
    const { getByTestId, queryByTestId } = renderCallout();

    fireEvent.click(getByTestId('modelDetailFlyoutViewDetailsButton'));

    expect(getByTestId('modelDetailFlyoutRegionUnavailableDescription')).toHaveTextContent(
      'Blocked by your region policy. This model is not available in your allowed regions.'
    );
    expect(getByTestId('modelDetailFlyoutHideDetailsButton')).toHaveTextContent('Hide details');
    expect(queryByTestId('modelDetailFlyoutViewDetailsButton')).not.toBeInTheDocument();
    expect(queryByTestId('modelDetailFlyoutEditRegionPreferencesButton')).not.toBeInTheDocument();
  });

  it('collapses details after Hide details', () => {
    const { getByTestId, queryByTestId } = renderCallout();

    fireEvent.click(getByTestId('modelDetailFlyoutViewDetailsButton'));
    fireEvent.click(getByTestId('modelDetailFlyoutHideDetailsButton'));

    expect(getByTestId('modelDetailFlyoutViewDetailsButton')).toBeInTheDocument();
    expect(queryByTestId('modelDetailFlyoutHideDetailsButton')).not.toBeInTheDocument();
    expect(getByTestId('modelDetailFlyoutRegionUnavailableCallout')).not.toHaveTextContent(
      'Blocked by your region policy'
    );
  });

  it('shows Edit Region preferences when expanded and onManageRegions is provided', () => {
    const onManageRegions = jest.fn();
    const { getByTestId } = renderCallout(onManageRegions);

    fireEvent.click(getByTestId('modelDetailFlyoutViewDetailsButton'));
    fireEvent.click(getByTestId('modelDetailFlyoutEditRegionPreferencesButton'));

    expect(getByTestId('modelDetailFlyoutEditRegionPreferencesButton')).toHaveTextContent(
      'Edit Region preferences'
    );
    expect(onManageRegions).toHaveBeenCalledTimes(1);
  });
});
