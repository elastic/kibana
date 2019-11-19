/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../features_tooltip/features_tooltip', () => ({
  FeaturesTooltip: () => {
    return (<div>mockFeaturesTooltip</div>);
  }
}));

import sinon from 'sinon';
import React from 'react';
import { mount, shallow } from 'enzyme';
import { TooltipControl, TOOLTIP_TYPE } from './tooltip_control';

// mutable map state
let featuresAtLocation;
let mapCenter;
let mockMbMapBounds;

const layerId = 'tfi3f';
const mbLayerId = 'tfi3f_circle';
const mockLayer = {
  getMbLayerIds: () => { return [mbLayerId]; },
  getId: () => { return layerId; },
  canShowTooltip: () => { return true; },
  getFeatureById: () => {
    return {
      geometry: {
        type: 'Point',
        coordinates: [102.0, 0.5]
      }
    };
  },
};

const mockMbMapHandlers = {};
const mockMBMap = {
  project: (lonLatArray) => {
    const lonDistanceFromCenter = Math.abs(lonLatArray[0] - mapCenter[0]);
    const latDistanceFromCenter = Math.abs(lonLatArray[1] - mapCenter[1]);
    return {
      x: lonDistanceFromCenter * 100,
      y: latDistanceFromCenter * 100,
    };
  },
  on: (eventName, callback) => {
    mockMbMapHandlers[eventName] = callback;
  },
  off: (eventName) => {
    delete mockMbMapHandlers[eventName];
  },
  getBounds: () => {
    return {
      getNorth: () => { return mockMbMapBounds.north; },
      getSouth: () => { return mockMbMapBounds.south; },
      getWest: () => { return mockMbMapBounds.west; },
      getEast: () => { return mockMbMapBounds.east; },
    };
  },
  getLayer: () => {},
  queryRenderedFeatures: () => { return featuresAtLocation; },
};

const defaultProps = {
  mbMap: mockMBMap,
  clearTooltipState: () => {},
  setTooltipState: () => {},
  layerList: [mockLayer],
  isDrawingFilter: false,
  addFilters: () => {},
  geoFields: [{  }],
};

const hoverTooltipState = {
  type: TOOLTIP_TYPE.HOVER,
  location: [-120, 30],
  features: [
    {
      id: 1,
      layerId: layerId,
      geometry: {},
    }
  ]
};

const lockedTooltipState = {
  type: TOOLTIP_TYPE.LOCKED,
  location: [-120, 30],
  features: [
    {
      id: 1,
      layerId: layerId,
      geometry: {},
    }
  ]
};

describe('TooltipControl', () => {

  beforeEach(() => {
    featuresAtLocation = [];
    mapCenter = [0, 0];
    mockMbMapBounds = {
      west: -180,
      east: 180,
      north: 90,
      south: -90
    };
  });

  describe('render', () => {
    describe('tooltipState is not provided', () => {
      test('should not render tooltip popover when tooltipState is not provided', () => {
        const component = shallow(
          <TooltipControl
            {...defaultProps}
          />
        );

        expect(component).toMatchSnapshot();
      });
    });

    describe('tooltipState is provided', () => {
      test('should render tooltip popover with features tooltip content', () => {
        const component = shallow(
          <TooltipControl
            {...defaultProps}
            tooltipState={hoverTooltipState}
          />
        );

        expect(component).toMatchSnapshot();
      });

      test('should render tooltip popover with custom tooltip content when renderTooltipContent provided', () => {
        const component = shallow(
          <TooltipControl
            {...defaultProps}
            tooltipState={hoverTooltipState}
            renderTooltipContent={(props) => {
              return <div {...props}>Custom tooltip content</div>;
            }}
          />
        );

        expect(component).toMatchSnapshot();
      });
    });
  });

  describe('on mouse out', () => {
    const clearTooltipStateStub = sinon.stub();

    beforeEach(() => {
      clearTooltipStateStub.reset();
    });

    test('should clear hover tooltip state', () => {
      mount(
        <TooltipControl
          {...defaultProps}
          clearTooltipState={clearTooltipStateStub}
          tooltipState={hoverTooltipState}
        />
      );

      mockMbMapHandlers.mouseout();

      sinon.assert.calledOnce(clearTooltipStateStub);
    });

    test('should not clear locked tooltip state', () => {
      mount(
        <TooltipControl
          {...defaultProps}
          clearTooltipState={clearTooltipStateStub}
          tooltipState={lockedTooltipState}
        />
      );

      mockMbMapHandlers.mouseout();

      sinon.assert.notCalled(clearTooltipStateStub);
    });
  });

  describe('on click', () => {
    const mockMapMouseEvent = {
      point: { x: 0, y: 0 },
      lngLat: { lng: 0, lat: 0 },
    };
    const setTooltipStateStub = sinon.stub();
    const clearTooltipStateStub = sinon.stub();

    beforeEach(() => {
      setTooltipStateStub.reset();
      clearTooltipStateStub.reset();
    });

    test('should ignore clicks when map is in drawing mode', () => {
      mount(
        <TooltipControl
          {...defaultProps}
          clearTooltipState={clearTooltipStateStub}
          setTooltipState={setTooltipStateStub}
          isDrawingFilter={true}
        />
      );

      mockMbMapHandlers.click(mockMapMouseEvent);

      sinon.assert.notCalled(clearTooltipStateStub);
      sinon.assert.notCalled(setTooltipStateStub);
    });

    test('should clear tooltip state when there are no features at clicked location', () => {
      featuresAtLocation = [];
      mount(
        <TooltipControl
          {...defaultProps}
          clearTooltipState={clearTooltipStateStub}
          setTooltipState={setTooltipStateStub}
        />
      );

      mockMbMapHandlers.click(mockMapMouseEvent);

      sinon.assert.calledOnce(clearTooltipStateStub);
      sinon.assert.notCalled(setTooltipStateStub);
    });

    test('should set tooltip state when there are features at clicked location and remove duplicate features', () => {
      const feature = {
        geometry: {
          type: 'Point',
          coordinates: [ 100, 30 ]
        },
        layer: {
          id: mbLayerId
        },
        properties: {
          __kbn__feature_id__: 1
        }
      };
      featuresAtLocation = [feature, feature];
      mount(
        <TooltipControl
          {...defaultProps}
          clearTooltipState={clearTooltipStateStub}
          setTooltipState={setTooltipStateStub}
        />
      );

      mockMbMapHandlers.click(mockMapMouseEvent);

      sinon.assert.notCalled(clearTooltipStateStub);
      sinon.assert.calledWith(setTooltipStateStub, {
        features: [{ id: 1, layerId: 'tfi3f' }],
        location: [100, 30],
        type: 'LOCKED'
      });
    });
  });

  describe('on map move', () => {
    const clearTooltipStateStub = sinon.stub();

    beforeEach(() => {
      clearTooltipStateStub.reset();
    });

    test('should safely handle map move when there is no tooltip location', () => {
      const component = mount(
        <TooltipControl
          {...defaultProps}
          clearTooltipState={clearTooltipStateStub}
        />
      );

      mockMbMapHandlers.move();
      component.update();

      sinon.assert.notCalled(clearTooltipStateStub);
    });

    test('should update popover location', () => {
      const component = mount(
        <TooltipControl
          {...defaultProps}
          tooltipState={hoverTooltipState}
          clearTooltipState={clearTooltipStateStub}
        />
      );

      // ensure x and y set from original tooltipState.location
      expect(component.state('x')).toBe(12000);
      expect(component.state('y')).toBe(3000);

      mapCenter = [25, -15];
      mockMbMapHandlers.move();
      component.update();

      // ensure x and y updated from new map center with same tooltipState.location
      expect(component.state('x')).toBe(14500);
      expect(component.state('y')).toBe(4500);

      sinon.assert.notCalled(clearTooltipStateStub);
    });

    test('should clear tooltip state if tooltip location is outside map bounds', () => {
      const component = mount(
        <TooltipControl
          {...defaultProps}
          tooltipState={hoverTooltipState}
          clearTooltipState={clearTooltipStateStub}
        />
      );

      // move map bounds outside of hoverTooltipState.location, which is [-120, 30]
      mockMbMapBounds = {
        west: -180,
        east: -170,
        north: 90,
        south: 80
      };
      mockMbMapHandlers.move();
      component.update();

      sinon.assert.calledOnce(clearTooltipStateStub);
    });
  });

  test('should un-register all map callbacks on unmount', () => {
    const component = mount(
      <TooltipControl
        {...defaultProps}
      />
    );

    expect(Object.keys(mockMbMapHandlers).length).toBe(4);

    component.unmount();
    expect(Object.keys(mockMbMapHandlers).length).toBe(0);
  });
});
