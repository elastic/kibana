/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const DrawCircle = {
  onSetup: function(opts) {
    const circle = this.newFeature({
      type: 'Feature',
      properties: {
        center: null,
        distance: 0,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[]]
      }
    });
    this.addFeature(circle);
    return {
      circle
    };
  },
  onClick: function(state, e) {
    if (!state.point) {
      const center = [e.lngLat.lng, e.lngLat.lat];
      const circleFeature = circle(center, state.initialRadiusInKm);
    }
    if (
      state.startPoint &&
      state.startPoint[0] !== e.lngLat.lng &&
      state.startPoint[1] !== e.lngLat.lat
    ) {
      this.updateUIClasses({ mouse: "pointer" });
      state.endPoint = [e.lngLat.lng, e.lngLat.lat];
      this.changeMode("simple_select", { featuresId: state.rectangle.id });
    }
    // on first click, save clicked point coords as starting for  rectangle
    const startPoint = [e.lngLat.lng, e.lngLat.lat];
    state.startPoint = startPoint;
  },
  onMouseMove: function(state, e) {
    // if startPoint, update the feature coordinates, using the bounding box concept
    // we are simply using the startingPoint coordinates and the current Mouse Position
    // coordinates to calculate the bounding box on the fly, which will be our rectangle
    if (state.startPoint) {
      state.rectangle.updateCoordinate(
        "0.0",
        state.startPoint[0],
        state.startPoint[1]
      ); //minX, minY - the starting point
      state.rectangle.updateCoordinate(
        "0.1",
        e.lngLat.lng,
        state.startPoint[1]
      ); // maxX, minY
      state.rectangle.updateCoordinate("0.2", e.lngLat.lng, e.lngLat.lat); // maxX, maxY
      state.rectangle.updateCoordinate(
        "0.3",
        state.startPoint[0],
        e.lngLat.lat
      ); // minX,maxY
      state.rectangle.updateCoordinate(
        "0.4",
        state.startPoint[0],
        state.startPoint[1]
      ); //minX,minY - ending point (equals to starting point)
    }
  },
  onStop: function(state) {
    this.updateUIClasses({ mouse: "none" });
    this.activateUIButton();

    // check to see if we've deleted this feature
    if (this.getFeature(state.rectangle.id) === undefined) return;

    //remove last added coordinate
    state.rectangle.removeCoordinate("0.4");
    if (state.rectangle.isValid()) {
      this.map.fire("draw.create", {
        features: [state.rectangle.toGeoJSON()]
      });
    } else {
      this.deleteFeature([state.rectangle.id], { silent: true });
      this.changeMode("simple_select", {}, { silent: true });
    }
  },
  toDisplayFeatures: function(state, geojson, display) {
    const isActivePolygon = geojson.properties.id === state.rectangle.id;
    geojson.properties.active = isActivePolygon ? "true" : "false";
    if (!isActivePolygon) return display(geojson);

    // Only render the rectangular polygon if it has the starting point
    if (!state.startPoint) return;
    return display(geojson);
  },
  onTrash: function(state) {
    this.deleteFeature([state.rectangle.id], { silent: true });
    this.changeMode("simple_select");
  }
};
