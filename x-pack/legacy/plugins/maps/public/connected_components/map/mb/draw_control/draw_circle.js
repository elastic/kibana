/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import turf from 'turf';
import turfCircle from '@turf/circle';

export const DrawCircle = {
  onSetup: function() {
    const circle = this.newFeature({
      type: 'Feature',
      properties: {
        center: null,
        radiusKm: 0,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[]],
      },
    });
    this.addFeature(circle);
    this.clearSelectedFeatures();
    this.updateUIClasses({ mouse: 'add' });
    this.setActionableState({
      trash: true,
    });
    return {
      circle,
    };
  },
  onKeyUp: function(state, e) {
    if (e.keyCode === 27) {
      // clear point when user hits escape
      state.circle.properties.center = null;
      state.circle.properties.radiusKm = 0;
      state.circle.incomingCoords([[]]);
    }
  },
  onClick: function(state, e) {
    if (!state.circle.properties.center) {
      // first click, start circle
      state.circle.properties.center = [e.lngLat.lng, e.lngLat.lat];
    } else {
      // second click, finish draw
      this.updateUIClasses({ mouse: 'pointer' });
      state.circle.properties.radiusKm = turf.distance(state.circle.properties.center, [
        e.lngLat.lng,
        e.lngLat.lat,
      ]);
      this.changeMode('simple_select', { featuresId: state.circle.id });
    }
  },
  onMouseMove: function(state, e) {
    if (!state.circle.properties.center) {
      // circle not started, nothing to update
      return;
    }

    const mouseLocation = [e.lngLat.lng, e.lngLat.lat];
    state.circle.properties.radiusKm = turf.distance(state.circle.properties.center, mouseLocation);
    const newCircleFeature = turfCircle(
      state.circle.properties.center,
      state.circle.properties.radiusKm
    );
    state.circle.incomingCoords(newCircleFeature.geometry.coordinates);
  },
  onStop: function(state) {
    this.updateUIClasses({ mouse: 'none' });
    this.activateUIButton();

    if (this.getFeature(state.circle.id) === undefined) return;

    if (state.circle.properties.center && state.circle.properties.radiusKm > 0) {
      this.map.fire('draw.create', {
        features: [state.circle.toGeoJSON()],
      });
    } else {
      this.deleteFeature([state.circle.id], { silent: true });
      this.changeMode('simple_select', {}, { silent: true });
    }
  },
  toDisplayFeatures: function(state, geojson, display) {
    if (state.circle.properties.center) {
      geojson.properties.active = 'true';
      return display(geojson);
    }
  },
  onTrash: function(state) {
    this.deleteFeature([state.circle.id], { silent: true });
    this.changeMode('simple_select');
  },
};
