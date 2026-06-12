/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./features_tooltip/features_tooltip', () => ({
  FeaturesTooltip: () => {
    return <div>mockFeaturesTooltip</div>;
  },
}));

import sinon from 'sinon';
import React from 'react';
import { mount, shallow } from 'enzyme';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import { TooltipPopover } from './tooltip_popover';

// mutable map state
let mapCenter = [0, 0];

const mockMbMapBounds = {
  west: -180,
  east: 180,
  north: 90,
  south: -90,
};

const layerId = 'tfi3f';

const mockMbMapHandlers: { [key: string]: () => void } = {};
const mockMBMap = {
  project: (lonLatArray: [number, number]) => {
    const lonDistanceFromCenter = Math.abs(lonLatArray[0] - mapCenter[0]);
    const latDistanceFromCenter = Math.abs(lonLatArray[1] - mapCenter[1]);
    return {
      x: lonDistanceFromCenter * 100,
      y: latDistanceFromCenter * 100,
    };
  },
  on: (eventName: string, callback: () => void) => {
    mockMbMapHandlers[eventName] = callback;
  },
  off: (eventName: string) => {
    delete mockMbMapHandlers[eventName];
  },
  getBounds: () => {
    return {
      getNorth: () => {
        return mockMbMapBounds.north;
      },
      getSouth: () => {
        return mockMbMapBounds.south;
      },
      getWest: () => {
        return mockMbMapBounds.west;
      },
      getEast: () => {
        return mockMbMapBounds.east;
      },
    };
  },
} as unknown as MbMap;

const defaultProps = {
  mbMap: mockMBMap,
  closeTooltip: () => {},
  addFilters: async () => {},
  location: [-120, 30] as [number, number],
  features: [
    {
      id: 1,
      layerId,
      mbProperties: {},
      actions: [],
    },
  ],
  isLocked: false,
  findLayerById: () => {
    return undefined;
  },
  index: 0,
  loadFeatureGeometry: () => {
    return null;
  },
  executionContext: {},
};

describe('TooltipPopover', () => {
  beforeEach(() => {
    mapCenter = [0, 0];
  });

  describe('render', () => {
    test('should render tooltip popover', () => {
      const component = shallow(<TooltipPopover {...defaultProps} />);

      expect(component).toMatchSnapshot();
    });

    test('should render tooltip popover with custom tooltip content when renderTooltipContent provided', () => {
      const component = shallow(
        <TooltipPopover
          {...defaultProps}
          renderTooltipContent={(props) => {
            return <div {...props}>Custom tooltip content</div>;
          }}
        />
      );

      expect(component).toMatchSnapshot();
    });

    test('should un-register all map callbacks on unmount', () => {
      const component = mount(<TooltipPopover {...defaultProps} />);

      expect(Object.keys(mockMbMapHandlers).length).toBe(1);

      component.unmount();
      expect(Object.keys(mockMbMapHandlers).length).toBe(0);
    });
  });

  describe('on map move', () => {
    const closeTooltipStub = sinon.stub();

    beforeEach(() => {
      closeTooltipStub.reset();
    });

    test('should update popover location', () => {
      const component = mount(<TooltipPopover {...defaultProps} closeTooltip={closeTooltipStub} />);

      // ensure x and y set from original tooltipState.location
      expect(component.state('x')).toBe(12000);
      expect(component.state('y')).toBe(3000);

      mapCenter = [25, -15];
      mockMbMapHandlers.move();
      component.update();

      // ensure x and y updated from new map center with same tooltipState.location
      expect(component.state('x')).toBe(14500);
      expect(component.state('y')).toBe(4500);

      sinon.assert.notCalled(closeTooltipStub);
    });
  });
});
