/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

import { EuiFieldNumber } from '@elastic/eui';
import {
  addOrdinalRow,
  removeRow,
  getColorInput,
  isOrdinalStopInvalid,
  isOrdinalStopsInvalid,
  getDeleteButton,
  getColorStopRow,
} from './color_stops_utils';
import { i18n } from '@kbn/i18n';

const DEFAULT_COLOR = '#FF0000';

export const ColorStopsOrdinal = ({
  colorStops = [{ stop: 0, color: DEFAULT_COLOR }],
  onChange,
}) => {
  function getStopInput(stop, index) {
    const onStopChange = e => {
      const newColorStops = _.cloneDeep(colorStops);
      const sanitizedValue = parseFloat(e.target.value);
      newColorStops[index].stop = isNaN(sanitizedValue) ? '' : sanitizedValue;
      onChange({
        colorStops: newColorStops,
        isInvalid: isOrdinalStopsInvalid(newColorStops),
      });
    };

    let error;
    if (isOrdinalStopInvalid(stop)) {
      error = i18n.translate('xpack.maps.styles.colorStops.ordinalStop.numberWarningLabel', {
        defaultMessage: 'Stop must be a number',
      });
    } else if (index !== 0 && colorStops[index - 1].stop >= stop) {
      error = i18n.translate(
        'xpack.maps.styles.colorStops.ordinalStop.numberOrderingWarningLabel',
        {
          defaultMessage: 'Stop must be greater than previous stop value',
        }
      );
    }

    return {
      stopError: error,
      stopInput: (
        <EuiFieldNumber
          aria-label={i18n.translate('xpack.maps.styles.colorStops.ordinalStop.stopLabel', {
            defaultMessage: 'Stop',
          })}
          value={stop}
          onChange={onStopChange}
          compressed
        />
      ),
    };
  }

  const rows = colorStops.map((colorStop, index) => {
    const onColorChange = color => {
      const newColorStops = _.cloneDeep(colorStops);
      newColorStops[index].color = color;
      onChange({
        colorStops: newColorStops,
        isInvalid: isOrdinalStopsInvalid(newColorStops),
      });
    };

    const { stopError, stopInput } = getStopInput(colorStop.stop, index);
    const { colorError, colorInput } = getColorInput(colorStops, onColorChange, colorStop.color);
    const errors = [];
    if (stopError) {
      errors.push(stopError);
    }
    if (colorError) {
      errors.push(colorError);
    }

    const onAdd = () => {
      const newColorStops = addOrdinalRow(colorStops, index);

      onChange({
        colorStops: newColorStops,
        isInvalid: isOrdinalStopsInvalid(newColorStops),
      });
    };

    let deleteButton;
    if (colorStops.length > 1) {
      const onRemove = () => {
        const newColorStops = removeRow(colorStops, index);
        onChange({
          colorStops: newColorStops,
          isInvalid: isOrdinalStopsInvalid(newColorStops),
        });
      };
      deleteButton = getDeleteButton(onRemove);
    }

    return getColorStopRow({ index, errors, stopInput, colorInput, deleteButton, onAdd });
  });

  return <div>{rows}</div>;
};

ColorStopsOrdinal.propTypes = {
  /**
   * Array of { stop, color }.
   * Stops are numbers in strictly ascending order.
   * The range is from the given stop number (inclusive) to the next stop number (exclusive).
   * Colors are color hex strings (3 or 6 character).
   */
  colorStops: PropTypes.arrayOf(
    PropTypes.shape({
      stopKey: PropTypes.number,
      color: PropTypes.string,
    })
  ),
  /**
   * Callback for when the color stops changes. Called with { colorStops, isInvalid }
   */
  onChange: PropTypes.func.isRequired,
};
