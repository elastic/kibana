/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

import { EuiFormRow, EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { addCategoricalRow, removeRow, getColorInput, getDeleteButton } from './color_stops_utils';

const DEFAULT_COLOR = '#FF0000';
const DEFAULT_NEXT_COLOR = '#00FF00';

export const ColorStopsCategorical = ({
  colorStops = [
    { stop: null, color: DEFAULT_COLOR }, //first stop is the "other" color
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
    const { stopInput } = getStopInput(colorStop.stop, index);
    const { colorError, colorInput } = getColorInput(colorStops, onChange, colorStop.color, index);
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
