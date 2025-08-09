/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./layer_toc', () => ({
  LayerTOC: () => {
    return <div>mockLayerTOC</div>;
  },
}));

jest.mock('../../../kibana_services', () => ({
  isScreenshotMode: () => {
    return false;
  },
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';


import { LayerControl } from './layer_control';
import { ILayer } from '../../../classes/layers/layer';

const defaultProps = {
  isReadOnly: false,
  showAddLayerWizard: async () => {},
  closeLayerTOC: () => {},
  openLayerTOC: () => {},
  hideAllLayers: () => {},
  showAllLayers: () => {},
  isLayerTOCOpen: true,
  layerList: [],
  isFlyoutOpen: false,
  zoom: 0,
};

describe('LayerControl', () => {
  test('is rendered', () => {
    render(
      <I18nProvider>
        <LayerControl {...defaultProps} />
      </I18nProvider>
    );

    // Verify layer control elements are present
    expect(screen.getByRole('heading', { name: 'Layers' })).toBeInTheDocument();
    expect(screen.getByLabelText('Hide all layers')).toBeInTheDocument();
    expect(screen.getByLabelText('Show all layers')).toBeInTheDocument();
    expect(screen.getByLabelText('Collapse layers panel')).toBeInTheDocument();
    expect(screen.getByText('mockLayerTOC')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add layer' })).toBeInTheDocument();
  });

  test('should disable buttons when flyout is open', () => {
    render(
      <I18nProvider>
        <LayerControl {...defaultProps} isFlyoutOpen={true} />
      </I18nProvider>
    );

    // Verify layer control elements are still present but add layer button is disabled
    expect(screen.getByRole('heading', { name: 'Layers' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add layer' })).toBeDisabled();
  });

  test('isReadOnly', () => {
    render(
      <I18nProvider>
        <LayerControl {...defaultProps} isReadOnly={true} />
      </I18nProvider>
    );

    // Verify layer control elements are present but add layer button is not shown in read-only mode
    expect(screen.getByRole('heading', { name: 'Layers' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add layer' })).not.toBeInTheDocument();
  });

  describe('isLayerTOCOpen', () => {
    test('Should render expand button', () => {
      render(
        <I18nProvider>
          <LayerControl {...defaultProps} isLayerTOCOpen={false} />
        </I18nProvider>
      );
      
      // Verify expand button is present when TOC is closed
      expect(screen.getByLabelText('Expand layers panel')).toBeInTheDocument();
      expect(screen.queryByText('mockLayerTOC')).not.toBeInTheDocument();
    });

    test('Should render expand button with loading icon when layer is loading', () => {
      render(
        <I18nProvider>
          <LayerControl
            {...defaultProps}
            isLayerTOCOpen={false}
            layerList={[
              {
                hasErrors: () => {
                  return false;
                },
                hasWarnings: () => {
                  return false;
                },
                isLayerLoading: () => {
                  return true;
                },
              } as unknown as ILayer,
            ]}
          />
        </I18nProvider>
      );
      
      // Verify expand button is present with loading state
      expect(screen.getByLabelText('Expand layers panel')).toBeInTheDocument();
    });

    test('Should render expand button with error icon when layer has error', () => {
      const mockLayerThatHasError = {
        hasErrors: () => {
          return true;
        },
        hasWarnings: () => {
          return false;
        },
        isLayerLoading: () => {
          return false;
        },
      } as unknown as ILayer;
      render(
        <I18nProvider>
          <LayerControl
            {...defaultProps}
            isLayerTOCOpen={false}
            layerList={[mockLayerThatHasError]}
          />
        </I18nProvider>
      );

      // Verify expand button is present with error state
      expect(screen.getByLabelText('Expand layers panel')).toBeInTheDocument();
    });
  });
});
