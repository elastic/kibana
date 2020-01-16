/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode, FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import 'react-datetime/css/react-datetime.css';
import { UnitStrings } from '../../../../../i18n/units';

const { quickRanges: strings } = UnitStrings;

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
  { from: 'now/d', to: 'now', display: strings.getTodayLabel() },
  { from: 'now-24h', to: 'now', display: strings.getLast24HoursLabel() },
  { from: 'now-7d', to: 'now', display: strings.getLast7DaysLabel() },
  { from: 'now-14d', to: 'now', display: strings.getLast2WeeksLabel() },
  { from: 'now-30d', to: 'now', display: strings.getLast30DaysLabel() },
  { from: 'now-90d', to: 'now', display: strings.getLast90DaysLabel() },
  { from: 'now-1y', to: 'now', display: strings.getLast1YearLabel() },
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
