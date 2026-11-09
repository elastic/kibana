/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import React from 'react';
import { EuiFieldNumber } from '@elastic/eui';
import { ColorStops } from './color_stops';
import type { ColorStop, StopValue } from '../../../../../../common/descriptor_types';
import {
  addOrdinalRow,
  isOrdinalStopInvalid,
  isOrdinalStopsInvalid,
  DEFAULT_CUSTOM_COLOR,
} from './color_stops_utils';
import { i18n } from '@kbn/i18n';

interface Props {
  /**
   * Array of { stop, color }.
   * Stops are numbers in strictly ascending order.
   * The range is from the given stop number (inclusive) to the next stop number (exclusive).
   * Colors are color hex strings (3 or 6 character).
   */
  colorStops?: ColorStop[];
  /**
   * Callback for when the color stops changes. Called with { colorStops, isInvalid }
   */
  onChange: (params: { colorStops: ColorStop[]; isInvalid: boolean }) => void;
  swatches?: string[];
}

export const ColorStopsOrdinal = ({
  colorStops = [{ stop: 0, color: DEFAULT_CUSTOM_COLOR }],
  onChange,
  swatches,
}: Props) => {
  const getStopError = (stop: StopValue, index: number) => {
    let error: string | undefined;
    if (isOrdinalStopInvalid(stop)) {
      error = i18n.translate('xpack.maps.styles.colorStops.ordinalStop.numberWarningLabel', {
        defaultMessage: 'Stop must be a number',
      });
    } else if (index !== 0 && (colorStops[index - 1].stop as number) >= (stop as number)) {
      error = i18n.translate(
        'xpack.maps.styles.colorStops.ordinalStop.numberOrderingWarningLabel',
        {
          defaultMessage: 'Stop must be greater than previous stop value',
        }
      );
    }
    return error;
  };

  const renderStopInput = (
    stop: StopValue,
    onStopChange: (newStopValue: StopValue) => void,
    index: number
  ) => {
    function handleOnChangeEvent(event: ChangeEvent<HTMLInputElement>) {
      const sanitizedValue = parseFloat(event.target.value);
      const newStopValue = isNaN(sanitizedValue) ? '' : sanitizedValue;
      onStopChange(newStopValue);
    }
    return (
      <EuiFieldNumber
        aria-label={i18n.translate('xpack.maps.styles.colorStops.ordinalStop.stopLabel', {
          defaultMessage: 'Stop',
        })}
        value={index === 0 ? '' : stop ?? ''}
        onChange={handleOnChangeEvent}
        compressed
        disabled={index === 0}
      />
    );
  };

  return (
    <ColorStops
      onChange={onChange}
      colorStops={colorStops}
      isStopsInvalid={isOrdinalStopsInvalid}
      getStopError={getStopError}
      renderStopInput={renderStopInput}
      addNewRow={addOrdinalRow}
      swatches={swatches}
    />
  );
};
