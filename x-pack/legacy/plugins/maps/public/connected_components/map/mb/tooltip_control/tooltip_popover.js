/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { LAT_INDEX, LON_INDEX } from '../../../../../common/constants';
import { FeaturesTooltip } from '../../features_tooltip/features_tooltip';
import { EuiPopover, EuiText } from '@elastic/eui';

export const TOOLTIP_TYPE = {
  HOVER: 'HOVER',
  LOCKED: 'LOCKED',
};

const noop = () => {};

export class TooltipPopover extends Component {
  state = {
    x: undefined,
    y: undefined,
    isVisible: true,
  };

  constructor(props) {
    super(props);
    this._popoverRef = React.createRef();
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.tooltipState) {
      const nextPoint = nextProps.mbMap.project(nextProps.tooltipState.location);
      if (nextPoint.x !== prevState.x || nextPoint.y !== prevState.y) {
        return {
          x: nextPoint.x,
          y: nextPoint.y,
        };
      }
    }

    return null;
  }

  componentDidMount() {
    this.props.mbMap.on('move', this._updatePopoverPosition);
  }

  componentDidUpdate() {
    if (this.props.tooltipState && this._popoverRef.current) {
      this._popoverRef.current.positionPopoverFluid();
    }
  }

  componentWillUnmount() {
    this.props.mbMap.off('move', this._updatePopoverPosition);
  }

  _updatePopoverPosition = () => {
    if (!this.props.tooltipState) {
      return;
    }

    const nextPoint = this.props.mbMap.project(this.props.tooltipState.location);
    const lat = this.props.tooltipState.location[LAT_INDEX];
    const lon = this.props.tooltipState.location[LON_INDEX];
    const bounds = this.props.mbMap.getBounds();
    this.setState({
      x: nextPoint.x,
      y: nextPoint.y,
      isVisible:
        lat < bounds.getNorth() &&
        lat > bounds.getSouth() &&
        lon > bounds.getWest() &&
        lon < bounds.getEast(),
    });
  };

  // Must load original geometry instead of using geometry from mapbox feature.
  // Mapbox feature geometry is from vector tile and is not the same as the original geometry.
  _loadFeatureGeometry = ({ layerId, featureId }) => {
    const tooltipLayer = this._findLayerById(layerId);
    if (!tooltipLayer) {
      return null;
    }

    const targetFeature = tooltipLayer.getFeatureById(featureId);
    if (!targetFeature) {
      return null;
    }

    return targetFeature.geometry;
  };

  _loadFeatureProperties = async ({ layerId, featureId }) => {
    const tooltipLayer = this._findLayerById(layerId);
    if (!tooltipLayer) {
      return [];
    }

    const targetFeature = tooltipLayer.getFeatureById(featureId);
    if (!targetFeature) {
      return [];
    }
    return await tooltipLayer.getPropertiesForTooltip(targetFeature.properties);
  };

  _loadPreIndexedShape = async ({ layerId, featureId }) => {
    const tooltipLayer = this._findLayerById(layerId);
    if (!tooltipLayer) {
      return null;
    }

    const targetFeature = tooltipLayer.getFeatureById(featureId);
    if (!targetFeature) {
      return null;
    }

    return await tooltipLayer.getSource().getPreIndexedShape(targetFeature.properties);
  };

  _findLayerById = layerId => {
    return this.props.layerList.find(layer => {
      return layer.getId() === layerId;
    });
  };

  _getLayerName = async layerId => {
    const layer = this._findLayerById(layerId);
    if (!layer) {
      return null;
    }

    return layer.getDisplayName();
  };

  _renderTooltipContent = () => {
    const publicProps = {
      addFilters: this.props.addFilters,
      closeTooltip: this.props.clearTooltipState,
      features: this.props.tooltipState.features,
      isLocked: this.props.tooltipState.type === TOOLTIP_TYPE.LOCKED,
      loadFeatureProperties: this._loadFeatureProperties,
      loadFeatureGeometry: this._loadFeatureGeometry,
      getLayerName: this._getLayerName,
    };

    if (this.props.renderTooltipContent) {
      return this.props.renderTooltipContent(publicProps);
    }

    return (
      <EuiText size="xs" style={{ maxWidth: '425px' }}>
        <FeaturesTooltip
          {...publicProps}
          findLayerById={this._findLayerById}
          geoFields={this.props.geoFields}
          loadPreIndexedShape={this._loadPreIndexedShape}
        />
      </EuiText>
    );
  };

  render() {
    if (!this.props.tooltipState || !this.state.isVisible) {
      return null;
    }

    const tooltipAnchor = (
      <div style={{ height: '26px', width: '26px', background: 'transparent' }} />
    );
    return (
      <EuiPopover
        id="mapTooltip"
        button={tooltipAnchor}
        anchorPosition="upCenter"
        isOpen
        closePopover={noop}
        ref={this._popoverRef}
        style={{
          pointerEvents: 'none',
          transform: `translate(${this.state.x - 13}px, ${this.state.y - 13}px)`,
        }}
      >
        {this._renderTooltipContent()}
      </EuiPopover>
    );
  }
}
