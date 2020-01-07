/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiColorPicker,
  EuiFormRow,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
} from '@elastic/eui';
import { addRow, removeRow, isColorInvalid, isStopInvalid, isInvalid } from './color_stops_utils';

const DEFAULT_COLOR = '#FF0000';

export const ColorStops = ({ colorStops = [{ stop: 0, color: DEFAULT_COLOR }], onChange }) => {
  function getStopInput(stop, index) {
    const onStopChange = e => {
      const newColorStops = _.cloneDeep(colorStops);
      const sanitizedValue = parseFloat(e.target.value);
      newColorStops[index].stop = isNaN(sanitizedValue) ? '' : sanitizedValue;
      onChange({
        colorStops: newColorStops,
        isInvalid: isInvalid(newColorStops),
      });
    };

    let error;
    if (isStopInvalid(stop)) {
      error = 'Stop must be a number';
    } else if (index !== 0 && colorStops[index - 1].stop >= stop) {
      error = 'Stop must be greater than previous stop value';
    }

    return {
      stopError: error,
      stopInput: (
        <EuiFieldNumber aria-label="Stop" value={stop} onChange={onStopChange} compressed />
      ),
    };
  }

  function getColorInput(color, index) {
    const onColorChange = color => {
      const newColorStops = _.cloneDeep(colorStops);
      newColorStops[index].color = color;
      onChange({
        colorStops: newColorStops,
        isInvalid: isInvalid(newColorStops),
      });
    };

    return {
      colorError: isColorInvalid(color) ? 'Color must provide a valid hex value' : undefined,
      colorInput: <EuiColorPicker onChange={onColorChange} color={color} compressed />,
    };
  }

  const rows = colorStops.map((colorStop, index) => {
    const { stopError, stopInput } = getStopInput(colorStop.stop, index);
    const { colorError, colorInput } = getColorInput(colorStop.color, index);
    const errors = [];
    if (stopError) {
      errors.push(stopError);
    }
    if (colorError) {
      errors.push(colorError);
    }

    const onRemove = () => {
      const newColorStops = removeRow(colorStops, index);
      onChange({
        colorStops: newColorStops,
        isInvalid: isInvalid(newColorStops),
      });
    };

    const onAdd = () => {
      const newColorStops = addRow(colorStops, index);

      onChange({
        colorStops: newColorStops,
        isInvalid: isInvalid(newColorStops),
      });
    };

    let deleteButton;
    if (colorStops.length > 1) {
      deleteButton = (
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          aria-label="Delete"
          title="Delete"
          onClick={onRemove}
        />
      );
    }

    return (
      <EuiFormRow
        key={index}
        className="mapColorStop"
        isInvalid={errors.length !== 0}
        error={errors}
        display="rowCompressed"
      >
        <div>
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
            <EuiFlexItem>{stopInput}</EuiFlexItem>
            <EuiFlexItem>{colorInput}</EuiFlexItem>
          </EuiFlexGroup>
          <div className="mapColorStop__icons">
            {deleteButton}
            <EuiButtonIcon
              iconType="plusInCircle"
              color="primary"
              aria-label="Add"
              title="Add"
              onClick={onAdd}
            />
          </div>
        </div>
      </EuiFormRow>
    );
  });

  return <div>{rows}</div>;
};

ColorStops.propTypes = {
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
