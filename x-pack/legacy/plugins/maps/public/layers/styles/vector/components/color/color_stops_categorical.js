/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

import { EuiFieldText } from '@elastic/eui';
import {
  addCategoricalRow,
  removeRow,
  getColorInput,
  getDeleteButton,
  getColorStopRow,
  DEFAULT_CUSTOM_COLOR,
  DEFAULT_NEXT_COLOR,
} from './color_stops_utils';

export const ColorStopsCategorical = ({
  colorStops = [
    { stop: null, color: DEFAULT_CUSTOM_COLOR }, //first stop is the "other" color
    { stop: '', color: DEFAULT_NEXT_COLOR },
  ],
  onChange,
}) => {
  function getStopInput(stop, index) {
    const onStopChange = e => {
      const newColorStops = _.cloneDeep(colorStops);
      newColorStops[index].stop = e.target.value;
      onChange({
        colorStops: newColorStops,
        isInvalid: false,
      });
    };

    let stopInput;
    if (index === 0) {
      stopInput = (
        <EuiFieldText
          aria-label="Default stop"
          value={stop}
          placeholder={'Default'}
          disabled
          onChange={onStopChange}
          compressed
        />
      );
    } else {
      stopInput = (
        <EuiFieldText aria-label="Category" value={stop} onChange={onStopChange} compressed />
      );
    }

    return {
      stopInput: stopInput,
    };
  }

  const rows = colorStops.map((colorStop, index) => {
    const onColorChange = color => {
      const newColorStops = _.cloneDeep(colorStops);
      newColorStops[index].color = color;
      onChange({
        colorStops: newColorStops,
        isInvalid: false,
      });
    };

    const { stopInput } = getStopInput(colorStop.stop, index);
    const { colorError, colorInput } = getColorInput(colorStops, onColorChange, colorStop.color);
    const errors = colorError ? [colorError] : [];

    const onAdd = () => {
      const newColorStops = addCategoricalRow(colorStops, index);
      onChange({
        colorStops: newColorStops,
        isInvalid: false,
      });
    };

    let deleteButton;
    if (colorStops.length > 2) {
      const onRemove = () => {
        const newColorStops = removeRow(colorStops, index);
        onChange({
          colorStops: newColorStops,
          isInvalid: false,
        });
      };
      deleteButton = getDeleteButton(onRemove);
    }

    return getColorStopRow({ index, errors, stopInput, colorInput, deleteButton, onAdd });
  });

  return <div>{rows}</div>;
};

ColorStopsCategorical.propTypes = {
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
