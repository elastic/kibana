/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { Header } from './header';
import { IVectorLayer } from '../../../../classes/layers/vector_layer';

const layerMock = {
  getDisplayName: async () => {
    return 'myLayerName';
  },
} as unknown as IVectorLayer;

const defaultProps = {
  findLayerById: (layerId: string) => {
    return layerMock;
  },
  isLocked: false,
  layerId: 'myLayerId',
  onClose: () => {
    return;
  },
};

test('render', async () => {
  render(
    <I18nProvider>
      <Header {...defaultProps} />
    </I18nProvider>
  );

  // Wait for layer name to load
  await waitFor(() => {
    expect(screen.getByText('myLayerName')).toBeInTheDocument();
  });
  
  // Verify header elements are present
  expect(screen.getByRole('heading', { name: 'myLayerName' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Close tooltip')).not.toBeInTheDocument();
});

test('isLocked', async () => {
  render(
    <I18nProvider>
      <Header {...defaultProps} isLocked={true} />
    </I18nProvider>
  );

  // Wait for layer name to load
  await waitFor(() => {
    expect(screen.getByText('myLayerName')).toBeInTheDocument();
  });
  
  // Verify header elements are present including close button when locked
  expect(screen.getByRole('heading', { name: 'myLayerName' })).toBeInTheDocument();
  expect(screen.getByLabelText('Close tooltip')).toBeInTheDocument();
});

// Test is sync to show render before async state is set.
test('should only show close button when layer name is not yet loaded', () => {
  render(
    <I18nProvider>
      <Header {...defaultProps} isLocked={true} />
    </I18nProvider>
  );
  
  // Verify close button is present immediately (before layer name loads)
  expect(screen.getByLabelText('Close tooltip')).toBeInTheDocument();
  
  // Verify layer name is not yet present
  expect(screen.queryByText('myLayerName')).not.toBeInTheDocument();
});
