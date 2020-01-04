/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { DRAW_TYPE } from '../../../../../common/constants';
import MapboxDraw from '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw-unminified';
import DrawRectangle from 'mapbox-gl-draw-rectangle-mode';
import {
  createSpatialFilterWithBoundingBox,
  createSpatialFilterWithGeometry,
  getBoundingBoxGeometry,
  roundCoordinates,
} from '../../../../elasticsearch_geo_utils';
import { DrawTooltip } from './draw_tooltip';

const mbDrawModes = MapboxDraw.modes;
mbDrawModes.draw_rectangle = DrawRectangle;

export class DrawControl extends React.Component {
  constructor() {
    super();
    this._mbDrawControl = new MapboxDraw({
      displayControlsDefault: false,
      modes: mbDrawModes,
    });
    this._mbDrawControlAdded = false;
  }

  componentDidUpdate() {
    this._syncDrawControl();
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
    this._removeDrawControl();
  }

  _syncDrawControl = _.debounce(() => {
    if (!this.props.mbMap) {
      return;
    }

    if (this.props.isDrawingFilter) {
      this._updateDrawControl();
    } else {
      this._removeDrawControl();
    }
  }, 256);

  _onDraw = e => {
    if (!e.features.length) {
      return;
    }

    const isBoundingBox = this.props.drawState.drawType === DRAW_TYPE.BOUNDS;
    const geometry = e.features[0].geometry;
    // MapboxDraw returns coordinates with 12 decimals. Round to a more reasonable number
    roundCoordinates(geometry.coordinates);

    try {
      const options = {
        indexPatternId: this.props.drawState.indexPatternId,
        geoFieldName: this.props.drawState.geoFieldName,
        geoFieldType: this.props.drawState.geoFieldType,
        geometryLabel: this.props.drawState.geometryLabel,
        relation: this.props.drawState.relation,
      };
      const filter = isBoundingBox
        ? createSpatialFilterWithBoundingBox({
            ...options,
            geometry: getBoundingBoxGeometry(geometry),
          })
        : createSpatialFilterWithGeometry({
            ...options,
            geometry,
          });
      this.props.addFilters([filter]);
    } catch (error) {
      // TODO notify user why filter was not created
      console.error(error);
    } finally {
      this.props.disableDrawState();
    }
  };

  _removeDrawControl() {
    if (!this._mbDrawControlAdded) {
      return;
    }

    this.props.mbMap.getCanvas().style.cursor = '';
    this.props.mbMap.off('draw.create', this._onDraw);
    this.props.mbMap.removeControl(this._mbDrawControl);
    this._mbDrawControlAdded = false;
  }

  _updateDrawControl() {
    if (!this._mbDrawControlAdded) {
      this.props.mbMap.addControl(this._mbDrawControl);
      this._mbDrawControlAdded = true;
      this.props.mbMap.getCanvas().style.cursor = 'crosshair';
      this.props.mbMap.on('draw.create', this._onDraw);
    }
    const mbDrawMode =
      this.props.drawState.drawType === DRAW_TYPE.POLYGON
        ? this._mbDrawControl.modes.DRAW_POLYGON
        : 'draw_rectangle';
    this._mbDrawControl.changeMode(mbDrawMode);
  }

  render() {
    if (!this.props.mbMap || !this.props.isDrawingFilter) {
      return null;
    }

    return <DrawTooltip mbMap={this.props.mbMap} drawState={this.props.drawState} />;
  }
}
