/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../kibana_services', () => ({}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';


import { MVTSingleLayerSourceSettings } from './mvt_single_layer_source_settings';

const defaultSettings = {
  handleChange: () => {},
  layerName: 'foobar',
  fields: [],
  minSourceZoom: 4,
  maxSourceZoom: 14,
  showFields: true,
};

test('should render with fields', async () => {
  render(
    <I18nProvider>
      <MVTSingleLayerSourceSettings {...defaultSettings} />
    </I18nProvider>
  );
  
  // Verify the Source layer input is present with correct value
  expect(screen.getByDisplayValue('foobar')).toBeInTheDocument();
  
  // Verify the Available levels tooltip text is present
  expect(screen.getByText('Available levels')).toBeInTheDocument();
  
  // Verify the Fields section is present (when showFields is true)
  expect(screen.getByText('Fields')).toBeInTheDocument();
});

test('should render without fields', async () => {
  const settings = { ...defaultSettings, showFields: false };
  render(
    <I18nProvider>
      <MVTSingleLayerSourceSettings {...settings} />
    </I18nProvider>
  );
  
  // Verify the Source layer input is present with correct value
  expect(screen.getByDisplayValue('foobar')).toBeInTheDocument();
  
  // Verify the Available levels tooltip text is present
  expect(screen.getByText('Available levels')).toBeInTheDocument();
  
  // Verify the Fields section is NOT present (when showFields is false)
  expect(screen.queryByText('Fields')).not.toBeInTheDocument();
});

test('should not render fields-editor when there is no layername', async () => {
  const settings = { ...defaultSettings, layerName: '' };
  render(
    <I18nProvider>
      <MVTSingleLayerSourceSettings {...settings} />
    </I18nProvider>
  );
  
  // Verify the Source layer input is present but empty
  const sourceLayerInput = screen.getByLabelText('Source layer');
  expect(sourceLayerInput).toHaveValue('');
  
  // Verify the Available levels tooltip text is present
  expect(screen.getByText('Available levels')).toBeInTheDocument();
  
  // Fields section should not be rendered when layerName is empty
  expect(screen.queryByText('Fields')).not.toBeInTheDocument();
});
