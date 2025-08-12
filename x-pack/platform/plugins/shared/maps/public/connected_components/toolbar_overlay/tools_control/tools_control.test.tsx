/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ToolsControl } from './tools_control';

const defaultProps = {
  initiateDraw: () => {},
  cancelDraw: () => {},
  filterModeActive: false,
  activateDrawFilterMode: () => {},
  deactivateDrawMode: () => {},
  disableToolsControl: false,
};

test('renders', async () => {
  render(
    <I18nProvider>
      <ToolsControl {...defaultProps} />
    </I18nProvider>
  );

  // Verify tools button is present
  expect(screen.getByLabelText('Tools')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Tools' })).toBeInTheDocument();
});

test('Should render cancel button when drawing', async () => {
  render(
    <I18nProvider>
      <ToolsControl {...defaultProps} filterModeActive={true} />
    </I18nProvider>
  );

  // Verify tools button and cancel button are present when filter mode is active
  expect(screen.getByLabelText('Tools')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
});
