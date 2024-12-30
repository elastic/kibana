/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { TIME_SERIES_LABEL, TERMS_LABEL } from './i18n_constants';
import { MAX_TERMS_TRACKS } from '../constants';

export function GroupByLabel() {
  return (
    <EuiToolTip
      content={
        <EuiText size="s">
          <dl>
            <dt>{TIME_SERIES_LABEL}</dt>
            <dd>
              <p>
                <FormattedMessage
                  id="xpack.maps.source.esGeoLine.groupBy.timeseriesDescription"
                  defaultMessage="Create a track for each unique time series. Track is simplifed when number of points exceeds limit."
                />
              </p>
            </dd>

            <dt>{TERMS_LABEL}</dt>
            <dd>
              <p>
                <FormattedMessage
                  id="xpack.maps.source.esGeoGrid.groupBy.termsDescription"
                  defaultMessage="Create a track for top {maxTermsTracks} terms. Track is truncated when number of points exceeds limit."
                  values={{ maxTermsTracks: MAX_TERMS_TRACKS }}
                />
              </p>
            </dd>
          </dl>
        </EuiText>
      }
    >
      <span>
        <FormattedMessage id="xpack.maps.source.esGeoGrid.groupByLabel" defaultMessage="Group by" />{' '}
        <EuiIcon type="questionInCircle" color="subdued" />
      </span>
    </EuiToolTip>
  );
}
