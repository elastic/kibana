/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';

import { getMetricChangeDescription } from '../../formatters/metric_change_description';

/*
 * Component for rendering the description cell in the anomalies table, which provides a
 * concise description of how the actual value of an anomaly compares to the typical value.
 */
export function DescriptionCell({ actual, typical }) {
  const { iconType, message } = getMetricChangeDescription(actual, typical);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {iconType !== undefined && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} size="s" />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText size="xs">{message}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

DescriptionCell.propTypes = {
  actual: PropTypes.oneOfType([PropTypes.array, PropTypes.number]),
  typical: PropTypes.oneOfType([PropTypes.array, PropTypes.number]),
};
