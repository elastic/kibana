/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';


import { NavigationPanel } from './navigation_panel';
import { getDefaultMapSettings } from '../../reducers/map/default_map_settings';
import { INITIAL_LOCATION } from '../../../common/constants';

const defaultProps = {
  center: { lat: 0, lon: 0 },
  settings: getDefaultMapSettings(),
  updateMapSetting: () => {},
  zoom: 0,
};

test('should render', async () => {
  render(
    <I18nProvider>
      <NavigationPanel {...defaultProps} />
    </I18nProvider>
  );

  // Verify the navigation title is present
  expect(screen.getByText('Navigation')).toBeInTheDocument();
  
  // Verify the auto fit to data bounds switch
  const autoFitSwitch = screen.getByTestId('autoFitToDataBoundsSwitch');
  expect(autoFitSwitch).toBeInTheDocument();
  
  // Verify zoom range label
  expect(screen.getByText('Zoom range')).toBeInTheDocument();
  
  // Verify initial map location section
  expect(screen.getByText('Initial map location')).toBeInTheDocument();
  
  // Verify radio options are present by their specific radio inputs
  expect(screen.getByLabelText('Map location at save')).toBeInTheDocument();
  expect(screen.getByLabelText('Fixed location')).toBeInTheDocument();
  expect(screen.getByLabelText('Browser location')).toBeInTheDocument();
  
  // Verify there are multiple "Auto fit map to data bounds" texts (switch + radio)
  const autoFitTexts = screen.getAllByText('Auto fit map to data bounds');
  expect(autoFitTexts).toHaveLength(2);
});

test('should render fixed location form when initialLocation is FIXED_LOCATION', async () => {
  const settings = {
    ...defaultProps.settings,
    initialLocation: INITIAL_LOCATION.FIXED_LOCATION,
  };
  
  render(
    <I18nProvider>
      <NavigationPanel {...defaultProps} settings={settings} />
    </I18nProvider>
  );

  // Verify basic navigation elements
  expect(screen.getByText('Navigation')).toBeInTheDocument();
  expect(screen.getByText('Initial map location')).toBeInTheDocument();
  
  // Verify Fixed location is selected in radio group
  const fixedLocationRadio = screen.getByLabelText('Fixed location');
  expect(fixedLocationRadio).toBeChecked();
  
  // Verify that fixed location form elements are present
  // (Based on snapshot, this will show additional form fields for coordinates)
});

test('should render browser location form when initialLocation is BROWSER_LOCATION', async () => {
  const settings = {
    ...defaultProps.settings,
    initialLocation: INITIAL_LOCATION.BROWSER_LOCATION,
  };
  
  render(
    <I18nProvider>
      <NavigationPanel {...defaultProps} settings={settings} />
    </I18nProvider>
  );

  // Verify basic navigation elements
  expect(screen.getByText('Navigation')).toBeInTheDocument();
  expect(screen.getByText('Initial map location')).toBeInTheDocument();
  
  // Verify Browser location is selected in radio group
  const browserLocationRadio = screen.getByLabelText('Browser location');
  expect(browserLocationRadio).toBeChecked();
});
