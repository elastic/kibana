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


import { MVTSingleLayerVectorSourceEditor } from './mvt_single_layer_vector_source_editor';

test('should render source creation editor (fields should _not_ be included)', async () => {
  render(
    <I18nProvider>
      <MVTSingleLayerVectorSourceEditor onSourceConfigChange={() => {}} />
    </I18nProvider>
  );

  // Verify the URL input field is present
  expect(screen.getByLabelText('Url')).toBeInTheDocument();
  
  // Verify the help text is present
  expect(screen.getByText(/URL of the .mvt vector tile service/)).toBeInTheDocument();
  
  // Verify the Source layer input is present
  expect(screen.getByLabelText('Source layer')).toBeInTheDocument();
  
  // Verify Available levels is present
  expect(screen.getByText('Available levels')).toBeInTheDocument();
});
