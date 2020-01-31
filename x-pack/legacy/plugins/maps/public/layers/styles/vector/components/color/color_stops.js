/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { removeRow, isColorInvalid } from './color_stops_utils';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiColorPicker, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';

function getColorStopRow({ index, errors, stopInput, colorInput, deleteButton, onAdd }) {
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
}

export function getDeleteButton(onRemove) {
  return (
    <EuiButtonIcon
      iconType="trash"
      color="danger"
      aria-label={i18n.translate('xpack.maps.styles.colorStops.deleteButtonAriaLabel', {
        defaultMessage: 'Delete',
      })}
      title={i18n.translate('xpack.maps.styles.colorStops.deleteButtonLabel', {
        defaultMessage: 'Delete',
      })}
      onClick={onRemove}
    />
  );
}

export const ColorStops = ({
  onChange,
  colorStops,
  isStopsInvalid,
  getStopError,
  renderStopInput,
  addNewRow,
  canDeleteStop,
}) => {
  function getStopInput(stop, index) {
    const onStopChange = newStopValue => {
      const newColorStops = _.cloneDeep(colorStops);
      newColorStops[index].stop = newStopValue;
      onChange({
        colorStops: newColorStops,
        isInvalid: isStopsInvalid(newColorStops),
      });
    };

    return {
      stopError: getStopError(stop, index),
      stopInput: renderStopInput(stop, onStopChange, index),
    };
  }

  function getColorInput(onColorChange, color) {
    return {
      colorError: isColorInvalid(color)
        ? i18n.translate('xpack.maps.styles.colorStops.hexWarningLabel', {
            defaultMessage: 'Color must provide a valid hex value',
          })
        : undefined,
      colorInput: <EuiColorPicker onChange={onColorChange} color={color} compressed />,
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
    const { colorError, colorInput } = getColorInput(onColorChange, colorStop.color);
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
