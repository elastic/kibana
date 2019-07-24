/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { fromExpression } from '@kbn/interpreter/common';
import { TimePicker } from '../time_picker';
import { TimePickerPopover } from '../time_picker_popover';

export interface FilterMeta {
  /** Name of datetime column to be filtered  */
  column: string;
  /** Start date string of filtered date range */
  from: string;
  /** End date string of filtered date range */
  to: string;
}

function getFilterMeta(filter: string): FilterMeta {
  const ast = fromExpression(filter);
  const column = get<string>(ast, 'chain[0].arguments.column[0]');
  const from = get<string>(ast, 'chain[0].arguments.from[0]');
  const to = get<string>(ast, 'chain[0].arguments.to[0]');
  return { column, from, to };
}

export interface Props {
  /** Initial value of the filter */
  filter: string;
  /** Function invoked when the filter changes */
  commit: (filter: string) => void;
  /** Determines if compact or full-sized time picker is displayed */
  compact?: boolean;
}

export const TimeFilter = ({ filter, commit, compact }: Props) => {
  const setFilter = (column: string) => (from: string, to: string) => {
    commit(`timefilter from="${from}" to=${to} column=${column}`);
  };

  const { column, from, to } = getFilterMeta(filter);

  if (compact) {
    return <TimePickerPopover from={from} to={to} onSelect={setFilter(column)} />;
  } else {
    return <TimePicker from={from} to={to} onSelect={setFilter(column)} />;
  }
};

TimeFilter.propTypes = {
  filter: PropTypes.string.isRequired,
  commit: PropTypes.func.isRequired, // Canvas filter
  compact: PropTypes.bool,
};
