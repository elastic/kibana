/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { XYZTMSEditor } from './xyz_tms_editor';

const onSourceConfigChange = () => {};

test('should render', () => {
  render(
    <I18nProvider>
      <XYZTMSEditor onSourceConfigChange={onSourceConfigChange} />
    </I18nProvider>
  );
  
  // Verify the URL input field is present
  expect(screen.getByLabelText('Url')).toBeInTheDocument();
  
  // Verify the placeholder text is present
  expect(screen.getByPlaceholderText('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png')).toBeInTheDocument();
});
