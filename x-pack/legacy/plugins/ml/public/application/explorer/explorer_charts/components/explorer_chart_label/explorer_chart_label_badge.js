/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiBadge } from '@elastic/eui';

export function ExplorerChartLabelBadge({ entity }) {
  return (
    <span className="ml-explorer-chart-label-badge">
      <EuiBadge color="hollow" className="ml-reset-font-weight">
        {entity.fieldName} <strong>{entity.fieldValue}</strong>
      </EuiBadge>
    </span>
  );
}
ExplorerChartLabelBadge.propTypes = {
  entity: PropTypes.shape({
    fieldName: PropTypes.string.isRequired,
    fieldValue: PropTypes.string.isRequired,
  }),
};
