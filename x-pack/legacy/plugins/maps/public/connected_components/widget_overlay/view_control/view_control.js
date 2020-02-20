/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { EuiText } from '@elastic/eui';
import { DECIMAL_DEGREES_PRECISION } from '../../../../common/constants';
import { FormattedMessage } from '@kbn/i18n/react';

export function ViewControl({ mouseCoordinates, zoom }) {
  if (!mouseCoordinates) {
    return null;
  }

  return (
    <div className="mapViewControl__coordinates">
      <EuiText size="xs">
        <small>
          <strong>
            <FormattedMessage id="xpack.maps.viewControl.latLabel" defaultMessage="lat:" />
          </strong>{' '}
          {_.round(mouseCoordinates.lat, DECIMAL_DEGREES_PRECISION)},{' '}
          <strong>
            <FormattedMessage id="xpack.maps.viewControl.lonLabel" defaultMessage="lon:" />
          </strong>{' '}
          {_.round(mouseCoordinates.lon, DECIMAL_DEGREES_PRECISION)},{' '}
          <strong>
            <FormattedMessage id="xpack.maps.viewControl.zoomLabel" defaultMessage="zoom:" />
          </strong>{' '}
          {zoom}
        </small>
      </EuiText>
    </div>
  );
}
