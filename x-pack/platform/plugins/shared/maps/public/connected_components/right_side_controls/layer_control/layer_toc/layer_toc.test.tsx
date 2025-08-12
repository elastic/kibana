/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./toc_entry', () => ({
  TOCEntry: () => {
    return <div>mockTOCEntry</div>;
  },
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { ILayer } from '../../../../classes/layers/layer';

import { LayerTOC } from './layer_toc';

const mockLayers = [
  {
    getId: () => {
      return '1';
    },
    getParent: () => {
      return undefined;
    },
    supportsFitToBounds: () => {
      return true;
    },
  } as unknown as ILayer,
  {
    getId: () => {
      return '2';
    },
    getParent: () => {
      return undefined;
    },
    supportsFitToBounds: () => {
      return false;
    },
  } as unknown as ILayer,
];

const defaultProps = {
  layerList: mockLayers,
  isReadOnly: false,
  openTOCDetails: [],
  moveLayerToBottom: () => {},
  moveLayerToLeftOfTarget: () => {},
  setLayerParent: () => {},
  createLayerGroup: () => {},
};

describe('LayerTOC', () => {
  test('is rendered', () => {
    render(
      <I18nProvider>
        <LayerTOC {...defaultProps} />
      </I18nProvider>
    );

    // Verify the layer TOC container is present
    expect(screen.getByTestId('mapLayerTOC')).toBeInTheDocument();
  });

  describe('props', () => {
    test('isReadOnly', () => {
      render(
        <I18nProvider>
          <LayerTOC {...defaultProps} isReadOnly={true} />
        </I18nProvider>
      );

      // Verify the layer TOC container is present and mocked entries are rendered
      expect(screen.getByTestId('mapLayerTOC')).toBeInTheDocument();
      expect(screen.getAllByText('mockTOCEntry')).toHaveLength(2);
    });
  });
});
