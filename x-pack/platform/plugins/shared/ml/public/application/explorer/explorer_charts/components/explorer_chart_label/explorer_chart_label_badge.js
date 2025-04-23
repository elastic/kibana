/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiBadge } from '@elastic/eui';
import { css } from '@emotion/react';

export function ExplorerChartLabelBadge({ entity }) {
  // Resets the badge's default strong font-weight so it's possible
  // to put custom emphasis inside the badge only on a part of it.
  // The entity's field_name will be styled as `normal` and field_value as `strong`.
  const resetFontWeightCss = css({ fontWeight: 'normal' });

  return (
    <span>
      <EuiBadge color="hollow" css={resetFontWeightCss}>
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
