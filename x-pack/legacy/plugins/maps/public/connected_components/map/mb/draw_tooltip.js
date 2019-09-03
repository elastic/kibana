/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DRAW_TYPE } from '../../../../common/constants';
import mapboxgl from 'mapbox-gl';
import { I18nProvider } from '@kbn/i18n/react';

export class DrawTooltip extends Component {

  constructor() {
    super();
    this._tooltipContainer = document.createElement('div');
    this._mbPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      anchor: 'left',
      maxWidth: '300px',
    });
  }

  componentDidMount() {
    this._showTooltip();
    this.props.mbMap.on('mousemove', this._updateTooltipLocation);
    this.props.mbMap.on('mouseout', this._hideTooltip);
  }

  componentWillUnmount() {
    this.props.mbMap.off('mousemove', this._updateTooltipLocation);
    this.props.mbMap.off('mouseout', this._hideTooltip);
    this._hideTooltip();
  }

  render() {
    return null;
  }

  _showTooltip = () => {
    const instructions = this.props.drawState.drawType === DRAW_TYPE.BOUNDS
      ? i18n.translate('xpack.maps.drawTooltip.boundsInstructions', {
        defaultMessage: 'Click to start rectangle. Click again to finish.'
      })
      : i18n.translate('xpack.maps.drawTooltip.polygonInstructions', {
        defaultMessage: 'Click to add vertex. Double click to finish.'
      });
    ReactDOM.render((
      <I18nProvider>
        <div>
          <EuiText color="subdued" size="xs">
            {instructions}
          </EuiText>
        </div>
      </I18nProvider>
    ), this._tooltipContainer);

    this._mbPopup.setDOMContent(this._tooltipContainer)
      .addTo(this.props.mbMap);
  }

  _hideTooltip = () => {
    if (this._mbPopup.isOpen()) {
      this._mbPopup.remove();
      ReactDOM.unmountComponentAtNode(this._tooltipContainer);
    }
  }

  _updateTooltipLocation = _.throttle(({ lngLat }) => {
    if (!this._mbPopup.isOpen()) {
      this._showTooltip();
    }
    this._mbPopup.setLngLat(lngLat);
  }, 100)
}
