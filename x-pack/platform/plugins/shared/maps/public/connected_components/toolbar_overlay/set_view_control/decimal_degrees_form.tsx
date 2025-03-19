/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiButton,
  EuiFieldNumber,
  EuiTextAlign,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { MapCenter, MapSettings } from '../../../../common/descriptor_types';
import { withinRange } from './utils';

interface Props {
  settings: MapSettings;
  zoom: number;
  center: MapCenter;
  onSubmit: (lat: number, lon: number, zoom: number) => void;
}

interface State {
  lat: number | string;
  lon: number | string;
  zoom: number | string;
}

export class DecimalDegreesForm extends Component<Props, State> {
  state: State = {
    lat: this.props.center.lat,
    lon: this.props.center.lon,
    zoom: this.props.zoom,
  };

  _onLatChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = parseFloat(evt.target.value);
    this.setState({
      lat: isNaN(sanitizedValue) ? '' : sanitizedValue,
    });
  };

  _onLonChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = parseFloat(evt.target.value);
    this.setState({
      lon: isNaN(sanitizedValue) ? '' : sanitizedValue,
    });
  };

  _onZoomChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = parseFloat(evt.target.value);
    this.setState({
      zoom: isNaN(sanitizedValue) ? '' : sanitizedValue,
    });
  };

  _onSubmit = () => {
    const { lat, lon, zoom } = this.state;
    this.props.onSubmit(lat as number, lon as number, zoom as number);
  };

  render() {
    const { isInvalid: isLatInvalid, error: latError } = withinRange(this.state.lat, -90, 90);
    const { isInvalid: isLonInvalid, error: lonError } = withinRange(this.state.lon, -180, 180);
    const { isInvalid: isZoomInvalid, error: zoomError } = withinRange(
      this.state.zoom,
      this.props.settings.minZoom,
      this.props.settings.maxZoom
    );

    return (
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.maps.setViewControl.latitudeLabel', {
            defaultMessage: 'Latitude',
          })}
          isInvalid={isLatInvalid}
          error={latError}
          display="columnCompressed"
        >
          <EuiFieldNumber
            compressed
            value={this.state.lat}
            onChange={this._onLatChange}
            isInvalid={isLatInvalid}
            data-test-subj="latitudeInput"
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.maps.setViewControl.longitudeLabel', {
            defaultMessage: 'Longitude',
          })}
          isInvalid={isLonInvalid}
          error={lonError}
          display="columnCompressed"
        >
          <EuiFieldNumber
            compressed
            value={this.state.lon}
            onChange={this._onLonChange}
            isInvalid={isLonInvalid}
            data-test-subj="longitudeInput"
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.maps.setViewControl.zoomLabel', {
            defaultMessage: 'Zoom',
          })}
          isInvalid={isZoomInvalid}
          error={zoomError}
          display="columnCompressed"
        >
          <EuiFieldNumber
            compressed
            value={this.state.zoom}
            onChange={this._onZoomChange}
            isInvalid={isZoomInvalid}
            data-test-subj="zoomInput"
          />
        </EuiFormRow>

        <EuiSpacer size="s" />

        <EuiTextAlign textAlign="right">
          <EuiButton
            size="s"
            fill
            disabled={isLatInvalid || isLonInvalid || isZoomInvalid}
            onClick={this._onSubmit}
            data-test-subj="submitViewButton"
          >
            <FormattedMessage
              id="xpack.maps.setViewControl.submitButtonLabel"
              defaultMessage="Go"
            />
          </EuiButton>
        </EuiTextAlign>
      </EuiForm>
    );
  }
}
