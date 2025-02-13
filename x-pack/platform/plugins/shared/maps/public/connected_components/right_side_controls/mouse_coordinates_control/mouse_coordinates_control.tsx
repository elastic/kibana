/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DECIMAL_DEGREES_PRECISION } from '../../../../common/constants';

export interface Props {
  mouseCoordinates?: {
    lat: number;
    lon: number;
  };
  zoom: number;
}

export function MouseCoordinatesControl({ mouseCoordinates, zoom }: Props) {
  let latLon;
  if (mouseCoordinates) {
    latLon = (
      <Fragment>
        <strong>
          <FormattedMessage id="xpack.maps.viewControl.latLabel" defaultMessage="lat:" />
        </strong>{' '}
        {_.round(mouseCoordinates.lat, DECIMAL_DEGREES_PRECISION)},{' '}
        <strong>
          <FormattedMessage id="xpack.maps.viewControl.lonLabel" defaultMessage="lon:" />
        </strong>{' '}
        {_.round(mouseCoordinates.lon, DECIMAL_DEGREES_PRECISION)},{' '}
      </Fragment>
    );
  }

  return (
    <div className="mapViewControl__coordinates">
      <EuiText size="xs">
        <small>
          {latLon}
          <strong>
            <FormattedMessage id="xpack.maps.viewControl.zoomLabel" defaultMessage="zoom:" />
          </strong>{' '}
          {zoom}
        </small>
      </EuiText>
    </div>
  );
}
