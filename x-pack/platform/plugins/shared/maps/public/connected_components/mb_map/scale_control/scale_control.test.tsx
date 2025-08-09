/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { ScaleControl } from './scale_control';
import type { LngLat, LngLatBounds, Map as MapboxMap, PointLike } from '@kbn/mapbox-gl';

const CLIENT_HEIGHT_PIXELS = 1200;
const DISTANCE_METERS = 87653;

const mockMbMapHandlers: { [key: string]: () => void } = {};
const mockMBMap = {
  on: (eventName: string, callback: () => void) => {
    mockMbMapHandlers[eventName] = callback;
  },
  off: (eventName: string) => {
    delete mockMbMapHandlers[eventName];
  },
  getContainer: () => {
    return {
      clientHeight: CLIENT_HEIGHT_PIXELS,
    };
  },
  getZoom: () => {
    return 4;
  },
  getBounds: () => {
    return {
      getNorth: () => {
        return 75;
      },
      getSouth: () => {
        return -60;
      },
    } as unknown as LngLatBounds;
  },
  unproject: (point: PointLike) => {
    return {
      distanceTo: (lngLat: LngLat) => {
        return DISTANCE_METERS;
      },
    } as unknown as LngLat;
  },
} as unknown as MapboxMap;

test('render', () => {
  render(
    <I18nProvider>
      <ScaleControl mbMap={mockMBMap} isFullScreen={false} />
    </I18nProvider>
  );
  
  // Verify the scale control displays the distance
  expect(screen.getByText('~50 km')).toBeInTheDocument();
});

test('isFullScreen', () => {
  render(
    <I18nProvider>
      <ScaleControl mbMap={mockMBMap} isFullScreen={true} />
    </I18nProvider>
  );
  
  // Verify the scale control displays the distance
  expect(screen.getByText('~50 km')).toBeInTheDocument();
});

test('should un-register all map callbacks on unmount', () => {
  const { unmount } = render(
    <I18nProvider>
      <ScaleControl mbMap={mockMBMap} isFullScreen={false} />
    </I18nProvider>
  );

  expect(Object.keys(mockMbMapHandlers).length).toBe(1);

  unmount();
  expect(Object.keys(mockMbMapHandlers).length).toBe(0);
});
