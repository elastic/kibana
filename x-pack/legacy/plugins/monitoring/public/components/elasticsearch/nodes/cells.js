/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get } from 'lodash';
import { formatMetric } from '../../../lib/format_number';
import { EuiText, EuiTitle, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

function OfflineCell() {
  return (
    <div className="monTableCell__number monTableCell__offline">
      N/A
    </div>
  );
}

const getSlopeArrow = (slope) => {
  if (slope || slope === 0) {
    return slope > 0 ? 'up' : 'down';
  }
  return null;
};

const metricVal = (metric, format, isPercent) => {
  if (isPercent) {
    return formatMetric(metric, format, '%', { prependSpace: false });
  }
  return formatMetric(metric, format);
};

const noWrapStyle = { overflowX: 'hidden', whiteSpace: 'nowrap' };

function MetricCell({ isOnline, metric = {}, isPercent, ...props }) {
  if (isOnline) {
    const { lastVal, maxVal, minVal, slope } = get(metric, 'summary', {});
    const format = get(metric, 'metric.format');

    return (
      <EuiFlexGroup gutterSize="m" alignItems="center" wrap {...props}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s" style={noWrapStyle}>
            <span>
              {metricVal(lastVal, format, isPercent)}
              &nbsp;
              <span className={`fa fa-long-arrow-${getSlopeArrow(slope)}`} />
            </span>
          </EuiTitle>
          <EuiText size="xs">
            {i18n.translate('xpack.monitoring.elasticsearch.nodes.cells.maxText', {
              defaultMessage: '{metric} max',
              values: {
                metric: metricVal(maxVal, format, isPercent)
              }
            })}
          </EuiText>
          <EuiText size="xs">
            {i18n.translate('xpack.monitoring.elasticsearch.nodes.cells.minText', {
              defaultMessage: '{metric} min',
              values: {
                metric: metricVal(minVal, format, isPercent)
              }
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return <OfflineCell/>;
}

export {
  OfflineCell,
  MetricCell
};
