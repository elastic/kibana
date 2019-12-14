/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { TOCEntry } from './view';

const LAYER_ID = '1';

const mockLayer = {
  getId: () => {
    return LAYER_ID;
  },
  getLegendDetails: () => {
    return <div>TOC details mock</div>;
  },
  getDisplayName: () => {
    return 'layer 1';
  },
  isVisible: () => {
    return true;
  },
  showAtZoomLevel: () => {
    return true;
  },
  hasErrors: () => {
    return false;
  },
  hasLegendDetails: () => {
    return true;
  },
};

const defaultProps = {
  layer: mockLayer,
  openLayerPanel: () => {},
  toggleVisible: () => {},
  fitToBounds: () => {},
  getSelectedLayerSelector: () => {},
  hasDirtyStateSelector: () => {},
  zoom: 0,
  isLegendDetailsOpen: false,
};

describe('TOCEntry', () => {
  test('is rendered', async () => {
    const component = shallowWithIntl(<TOCEntry {...defaultProps} />);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  describe('props', () => {
    test('isReadOnly', async () => {
      const component = shallowWithIntl(<TOCEntry {...defaultProps} isReadOnly={true} />);

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      expect(component).toMatchSnapshot();
    });

    test('should display layer details when isLegendDetailsOpen is true', async () => {
      const component = shallowWithIntl(<TOCEntry {...defaultProps} isLegendDetailsOpen={true} />);

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      expect(component).toMatchSnapshot();
    });
  });
});
