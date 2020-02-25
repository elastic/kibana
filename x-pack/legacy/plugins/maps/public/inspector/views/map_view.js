/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { MapDetails } from './map_details';
import { i18n } from '@kbn/i18n';

class MapViewComponent extends Component {
  constructor(props) {
    super(props);
    props.adapters.map.on('change', this._onMapChange);

    const { stats, style } = props.adapters.map.getMapState();
    this.state = {
      stats,
      mapStyle: style,
    };
  }

  _onMapChange = () => {
    const { stats, style } = this.props.adapters.map.getMapState();
    this.setState({
      stats,
      mapStyle: style,
    });
  };

  componentWillUnmount() {
    this.props.adapters.map.removeListener('change', this._onMapChange);
  }

  render() {
    return (
      <MapDetails
        centerLon={this.state.stats.center[0]}
        centerLat={this.state.stats.center[1]}
        zoom={this.state.stats.zoom}
        mapStyle={this.state.mapStyle}
      />
    );
  }
}

MapViewComponent.propTypes = {
  adapters: PropTypes.object.isRequired,
};

const MapView = {
  title: i18n.translate('xpack.maps.inspector.mapDetailsViewTitle', {
    defaultMessage: 'Map details',
  }),
  order: 30,
  help: i18n.translate('xpack.maps.inspector.mapDetailsViewHelpText', {
    defaultMessage: 'View the map state',
  }),
  shouldShow(adapters) {
    return Boolean(adapters.map);
  },
  component: MapViewComponent,
};

export { MapView };
