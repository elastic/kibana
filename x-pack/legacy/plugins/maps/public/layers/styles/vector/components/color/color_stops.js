/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { removeRow, getColorInput, getDeleteButton, getColorStopRow } from './color_stops_utils';

export const ColorStops = ({
  onChange,
  colorStops,
  isStopsInvalid,
  sanitizeStopInput,
  getStopError,
  renderStopInput,
  addNewRow,
  canDeleteStop,
}) => {
  function getStopInput(stop, index) {
    const onStopChange = e => {
      const newColorStops = _.cloneDeep(colorStops);
      const newValue = sanitizeStopInput(e.target.value);
      newColorStops[index].stop = newValue;
      onChange({
        colorStops: newColorStops,
        isInvalid: isStopsInvalid(newColorStops),
      });
    };

    const error = getStopError(stop, index);
    return {
      stopError: error,
      stopInput: renderStopInput(stop, onStopChange, index),
    };
  }

  const rows = colorStops.map((colorStop, index) => {
    const onColorChange = color => {
      const newColorStops = _.cloneDeep(colorStops);
      newColorStops[index].color = color;
      onChange({
        colorStops: newColorStops,
        isInvalid: isStopsInvalid(newColorStops),
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
      const newColorStops = addNewRow(colorStops, index);
      onChange({
        colorStops: newColorStops,
        isInvalid: isStopsInvalid(newColorStops),
      });
    };

    let deleteButton;
    if (canDeleteStop(colorStops, index)) {
      const onRemove = () => {
        const newColorStops = removeRow(colorStops, index);
        onChange({
          colorStops: newColorStops,
          isInvalid: isStopsInvalid(newColorStops),
        });
      };
      deleteButton = getDeleteButton(onRemove);
    }

    return getColorStopRow({ index, errors, stopInput, colorInput, deleteButton, onAdd });
  });

  return <div>{rows}</div>;
};
