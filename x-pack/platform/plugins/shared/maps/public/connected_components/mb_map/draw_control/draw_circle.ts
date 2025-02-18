/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

// @ts-expect-error
import turfDistance from '@turf/distance';
// @ts-expect-error
import turfCircle from '@turf/circle';
import { Feature, GeoJSON, Position } from 'geojson';

const DRAW_CIRCLE_RADIUS = 'draw-circle-radius';

export const DRAW_CIRCLE_RADIUS_LABEL_STYLE = {
  id: 'gl-draw-radius-label',
  type: 'symbol',
  filter: ['==', 'meta', DRAW_CIRCLE_RADIUS],
  layout: {
    'text-anchor': 'right',
    'text-field': '{radiusLabel}',
    'text-size': 16,
    'text-offset': [-1, 0],
    'text-ignore-placement': true,
    'text-allow-overlap': true,
  },
  paint: {
    'text-color': '#fbb03b',
    'text-halo-color': 'rgba(0, 0, 0, 1)',
    'text-halo-width': 2,
  },
};

export interface DrawCircleProperties {
  center: Position;
  radiusKm: number;
}

type DrawCircleState = {
  circle: {
    properties: Omit<DrawCircleProperties, 'center'> & {
      center: Position | null;
      edge: Position | null;
      radiusKm: number;
    };
    id: string | number;
    incomingCoords: (coords: unknown[]) => void;
    toGeoJSON: () => GeoJSON;
  };
};

type MouseEvent = {
  lngLat: {
    lng: number;
    lat: number;
  };
};

export const DrawCircle = {
  onSetup() {
    // @ts-ignore
    const circle: unknown = this.newFeature({
      type: 'Feature',
      properties: {
        center: null,
        edge: null,
        radiusKm: 0,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[]],
      },
    });

    // @ts-ignore
    this.addFeature(circle);
    // @ts-ignore
    this.clearSelectedFeatures();
    // @ts-ignore
    this.updateUIClasses({ mouse: 'add' });
    // @ts-ignore
    this.setActionableState({
      trash: true,
    });
    return {
      circle,
    };
  },
  onKeyUp(state: DrawCircleState, e: { keyCode: number }) {
    if (e.keyCode === 27) {
      // clear point when user hits escape
      state.circle.properties.center = null;
      state.circle.properties.radiusKm = 0;
      state.circle.incomingCoords([[]]);
    }
  },
  onClick(state: DrawCircleState, e: MouseEvent) {
    if (!state.circle.properties.center) {
      // first click, start circle
      state.circle.properties.center = [e.lngLat.lng, e.lngLat.lat];
    } else {
      // second click, finish draw
      // @ts-ignore
      this.updateUIClasses({ mouse: 'pointer' });
      state.circle.properties.radiusKm = turfDistance(state.circle.properties.center, [
        e.lngLat.lng,
        e.lngLat.lat,
      ]);
      // @ts-ignore
      this.changeMode('simple_select', { featuresId: state.circle.id });
    }
  },
  onMouseMove(state: DrawCircleState, e: MouseEvent) {
    if (!state.circle.properties.center) {
      // circle not started, nothing to update
      return;
    }

    const mouseLocation = [e.lngLat.lng, e.lngLat.lat];
    state.circle.properties.edge = mouseLocation;
    state.circle.properties.radiusKm = turfDistance(state.circle.properties.center, mouseLocation);
    const newCircleFeature = turfCircle(
      state.circle.properties.center,
      state.circle.properties.radiusKm
    );
    state.circle.incomingCoords(newCircleFeature.geometry.coordinates);
  },
  onStop(state: DrawCircleState) {
    // @ts-ignore
    this.updateUIClasses({ mouse: 'none' });
    // @ts-ignore
    this.activateUIButton();

    // @ts-ignore
    if (this.getFeature(state.circle.id) === undefined) return;

    if (state.circle.properties.center && state.circle.properties.radiusKm > 0) {
      // @ts-ignore
      this.map.fire('draw.create', {
        features: [state.circle.toGeoJSON()],
      });
    } else {
      // @ts-ignore
      this.deleteFeature([state.circle.id], { silent: true });
      // @ts-ignore
      this.changeMode('simple_select', {}, { silent: true });
    }
  },
  toDisplayFeatures(state: DrawCircleState, geojson: Feature, display: (geojson: Feature) => void) {
    if (!state.circle.properties.center || !state.circle.properties.edge) {
      return null;
    }

    geojson.properties!.active = 'true';

    let radiusLabel = '';
    if (state.circle.properties.radiusKm <= 1) {
      radiusLabel = `${Math.round(state.circle.properties.radiusKm * 1000)} m`;
    } else if (state.circle.properties.radiusKm <= 10) {
      radiusLabel = `${state.circle.properties.radiusKm.toFixed(1)} km`;
    } else {
      radiusLabel = `${Math.round(state.circle.properties.radiusKm)} km`;
    }

    // display radius label, requires custom style: DRAW_CIRCLE_RADIUS_LABEL_STYLE
    display({
      type: 'Feature',
      properties: {
        meta: DRAW_CIRCLE_RADIUS,
        parent: state.circle.id,
        radiusLabel,
        active: 'false',
      },
      geometry: {
        type: 'Point',
        coordinates: state.circle.properties.edge,
      },
    });

    // display line from center vertex to edge
    display({
      type: 'Feature',
      properties: {
        meta: 'draw-circle-radius-line',
        parent: state.circle.id,
        active: 'true',
      },
      geometry: {
        type: 'LineString',
        coordinates: [state.circle.properties.center, state.circle.properties.edge],
      },
    });

    // display circle
    display(geojson);
  },
  onTrash(state: DrawCircleState) {
    // @ts-ignore
    this.deleteFeature([state.circle.id], { silent: true });
    // @ts-ignore
    this.changeMode('simple_select');
  },
};
