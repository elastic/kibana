/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode, FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import 'react-datetime/css/react-datetime.css';

interface Props {
  /** Initial start date string */
  from: string;
  /** Initial end date string */
  to: string;

  /** Function invoked when a date range is clicked */
  onSelect: (from: string, to: string) => void;

  /** Nodes to display under the date range buttons */
  children?: ReactNode;
}

const quickRanges = [
  { from: 'now/d', to: 'now', display: 'Today' },
  { from: 'now-24h', to: 'now', display: 'Last 24 hours' },
  { from: 'now-7d', to: 'now', display: 'Last 7 days' },
  { from: 'now-14d', to: 'now', display: 'Last 2 weeks' },
  { from: 'now-30d', to: 'now', display: 'Last 30 days' },
  { from: 'now-90d', to: 'now', display: 'Last 90 days' },
  { from: 'now-1y', to: 'now', display: 'Last 1 year' },
];

export const DatetimeQuickList: FunctionComponent<Props> = ({ from, to, onSelect, children }) => (
  <div style={{ display: 'grid', alignItems: 'center' }}>
    {quickRanges.map((range, i) =>
      from === range.from && to === range.to ? (
        <EuiButton size="s" fill key={i} onClick={() => onSelect(range.from, range.to)}>
          {range.display}
        </EuiButton>
      ) : (
        <EuiButtonEmpty size="s" key={i} onClick={() => onSelect(range.from, range.to)}>
          {range.display}
        </EuiButtonEmpty>
      )
    )}
    {children}
  </div>
);

DatetimeQuickList.propTypes = {
  from: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  children: PropTypes.node,
};
