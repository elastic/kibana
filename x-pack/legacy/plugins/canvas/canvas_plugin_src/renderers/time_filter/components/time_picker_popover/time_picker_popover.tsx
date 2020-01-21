/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, MouseEvent } from 'react';
import PropTypes from 'prop-types';
// @ts-ignore untyped local
import { Popover } from '../../../../../public/components/popover';
import { PrettyDuration } from '../pretty_duration';
import { formatDuration } from '../pretty_duration/lib/format_duration';
import { TimePicker } from '../time_picker';

export interface Props {
  /** Start date string */
  from: string;
  /** End date string */
  to: string;
  /** Function invoked when date range is changed */
  onSelect: (from: string, to: string) => void;
}

export const TimePickerPopover: FunctionComponent<Props> = ({ from, to, onSelect }) => {
  const button = (handleClick: (event: MouseEvent<HTMLButtonElement>) => void) => (
    <button
      className="canvasTimePickerPopover__button"
      aria-label={`Displaying data ${formatDuration(
        from,
        to
      )}. Click to open a calendar tool to select a new time range.`}
      onClick={handleClick}
    >
      <PrettyDuration from={from} to={to} />
    </button>
  );

  return (
    <Popover
      id="timefilter-popover-trigger-click"
      className="canvasTimePickerPopover"
      anchorClassName="canvasTimePickerPopover__anchor"
      button={button}
    >
      {({ closePopover }) => (
        <TimePicker
          from={from}
          to={to}
          onSelect={(...args) => {
            onSelect(...args);
            closePopover();
          }}
        />
      )}
    </Popover>
  );
};

TimePickerPopover.propTypes = {
  from: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
};
