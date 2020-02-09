/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { FEATURE_ID_PROPERTY_NAME, LON_INDEX } from '../../../../../common/constants';
import { TooltipPopover } from './tooltip_popover';

export const TOOLTIP_TYPE = {
  HOVER: 'HOVER',
  LOCKED: 'LOCKED',
};

function justifyAnchorLocation(mbLngLat, targetFeature) {
  let popupAnchorLocation = [mbLngLat.lng, mbLngLat.lat]; // default popup location to mouse location
  if (targetFeature.geometry.type === 'Point') {
    const coordinates = targetFeature.geometry.coordinates.slice();

    // Ensure that if the map is zoomed out such that multiple
    // copies of the feature are visible, the popup appears
    // over the copy being pointed to.
    while (Math.abs(mbLngLat.lng - coordinates[LON_INDEX]) > 180) {
      coordinates[0] += mbLngLat.lng > coordinates[LON_INDEX] ? 360 : -360;
    }

    popupAnchorLocation = coordinates;
  }
  return popupAnchorLocation;
}

export class TooltipControl extends React.Component {
  componentDidMount() {
    this.props.mbMap.on('mouseout', this._onMouseout);
    this.props.mbMap.on('mousemove', this._updateHoverTooltipState);
    this.props.mbMap.on('click', this._lockTooltip);
  }

  componentWillUnmount() {
    this.props.mbMap.off('mouseout', this._onMouseout);
    this.props.mbMap.off('mousemove', this._updateHoverTooltipState);
    this.props.mbMap.off('click', this._lockTooltip);
  }

  _onMouseout = () => {
    this._updateHoverTooltipState.cancel();
    if (this.props.lockedTooltips.length === 0) {
      this.props.clearTooltipState();
    }
  };

  _getLayerByMbLayerId(mbLayerId) {
    return this.props.layerList.find(layer => {
      const mbLayerIds = layer.getMbLayerIds();
      return mbLayerIds.indexOf(mbLayerId) > -1;
    });
  }

  _getIdsForFeatures(mbFeatures) {
    const uniqueFeatures = [];
    //there may be duplicates in the results from mapbox
    //this is because mapbox returns the results per tile
    //for polygons or lines, it might return multiple features, one for each tile
    for (let i = 0; i < mbFeatures.length; i++) {
      const mbFeature = mbFeatures[i];
      const layer = this._getLayerByMbLayerId(mbFeature.layer.id);
      const featureId = mbFeature.properties[FEATURE_ID_PROPERTY_NAME];
      const layerId = layer.getId();
      let match = false;
      for (let j = 0; j < uniqueFeatures.length; j++) {
        const uniqueFeature = uniqueFeatures[j];
        if (featureId === uniqueFeature.id && layerId === uniqueFeature.layerId) {
          match = true;
          break;
        }
      }
      if (!match) {
        uniqueFeatures.push({
          id: featureId,
          layerId: layerId,
        });
      }
    }
    return uniqueFeatures;
  }

  _lockTooltip = e => {
    if (this.props.isDrawingFilter) {
      //ignore click events when in draw mode
      return;
    }

    this._updateHoverTooltipState.cancel(); //ignore any possible moves

    const mbFeatures = this._getFeaturesUnderPointer(e.point);
    if (!mbFeatures.length) {
      this.props.clearTooltipState();
      return;
    }

    const targetMbFeataure = mbFeatures[0];
    const popupAnchorLocation = justifyAnchorLocation(e.lngLat, targetMbFeataure);

    const features = this._getIdsForFeatures(mbFeatures);
    this.props.openLockedTooltip({
      features: features,
      location: popupAnchorLocation,
    });
  };

  _updateHoverTooltipState = _.debounce(e => {
    if (this.props.isDrawingFilter) {
      //ignore hover events when in draw mode
      return;
    }

    if (this.props.lockedTooltips.length) {
      //ignore hover events when tooltip is locked
      return;
    }

    const mbFeatures = this._getFeaturesUnderPointer(e.point);
    if (!mbFeatures.length) {
      this.props.clearTooltipState();
      return;
    }

    const targetMbFeature = mbFeatures[0];
    if (this.props.tooltipState) {
      const firstFeature = this.props.tooltipState.features[0];
      if (targetMbFeature.properties[FEATURE_ID_PROPERTY_NAME] === firstFeature.id) {
        return;
      }
    }

    const popupAnchorLocation = justifyAnchorLocation(e.lngLat, targetMbFeature);
    const features = this._getIdsForFeatures(mbFeatures);
    this.props.setTooltipState({
      type: TOOLTIP_TYPE.HOVER,
      features: features,
      location: popupAnchorLocation,
    });
  }, 100);

  _getMbLayerIdsForTooltips() {
    const mbLayerIds = this.props.layerList.reduce((mbLayerIds, layer) => {
      return layer.canShowTooltip() ? mbLayerIds.concat(layer.getMbLayerIds()) : mbLayerIds;
    }, []);

    //Ensure that all layers are actually on the map.
    //The raw list may contain layer-ids that have not been added to the map yet.
    //For example:
    //a vector or heatmap layer will not add a source and layer to the mapbox-map, until that data is available.
    //during that data-fetch window, the app should not query for layers that do not exist.
    return mbLayerIds.filter(mbLayerId => {
      return !!this.props.mbMap.getLayer(mbLayerId);
    });
  }

  _getFeaturesUnderPointer(mbLngLatPoint) {
    if (!this.props.mbMap) {
      return [];
    }

    const mbLayerIds = this._getMbLayerIdsForTooltips();
    const PADDING = 2; //in pixels
    const mbBbox = [
      {
        x: mbLngLatPoint.x - PADDING,
        y: mbLngLatPoint.y - PADDING,
      },
      {
        x: mbLngLatPoint.x + PADDING,
        y: mbLngLatPoint.y + PADDING,
      },
    ];
    return this.props.mbMap.queryRenderedFeatures(mbBbox, { layers: mbLayerIds });
  }

  render() {
    if (this.props.lockedTooltips.length) {
      return this.props.lockedTooltips.map(({ features, location, id }) => {
        const closeTooltip = () => {
          this.props.closeLockedTooltip(id);
        };
        return (
          <TooltipPopover
            key={id}
            mbMap={this.props.mbMap}
            layerList={this.props.layerList}
            addFilters={this.props.addFilters}
            renderTooltipContent={this.props.renderTooltipContent}
            geoFields={this.props.geoFields}
            features={features}
            location={location}
            closeTooltip={closeTooltip}
            isLocked={true}
          />
        );
      });
    }

    return null;
  }
}
