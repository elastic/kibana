/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../kibana_services', () => ({
  isScreenshotMode: () => {
    return false;
  },
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { ILayer } from '../../../classes/layers/layer';

import { AttributionControl } from './attribution_control';

describe('AttributionControl', () => {
  test('is rendered', async () => {
    const mockLayer1 = {
      getAttributions: async () => {
        return [{ url: '', label: 'attribution with no link' }];
      },
    } as unknown as ILayer;
    const mockLayer2 = {
      getAttributions: async () => {
        return [{ url: 'https://coolmaps.com', label: 'attribution with link' }];
      },
    } as unknown as ILayer;
    render(
      <I18nProvider>
        <AttributionControl layerList={[mockLayer1, mockLayer2]} isFullScreen={true} />
      </I18nProvider>
    );

    // Wait for attributions to load
    await waitFor(() => {
      expect(screen.getByText('attribution with link')).toBeInTheDocument();
    });
    
    // Verify attribution control has the correct CSS class
    expect(document.querySelector('.mapAttributionControl__fullScreen')).toBeInTheDocument();
    
    // Verify link attribution
    expect(screen.getByRole('link', { name: 'attribution with link (external, opens in a new tab or window)' })).toHaveAttribute('href', 'https://coolmaps.com');
  });
});
