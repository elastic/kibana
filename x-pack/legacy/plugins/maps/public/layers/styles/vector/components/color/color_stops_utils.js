/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiColorPicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  isValidHex,
} from '@elastic/eui';
import React from 'react';
import { COLOR_MAP_TYPE } from '../../../../../../common/constants';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';

export function removeRow(colorStops, index) {
  if (colorStops.length === 1) {
    return colorStops;
  }

  return [...colorStops.slice(0, index), ...colorStops.slice(index + 1)];
}

export function addOrdinalRow(colorStops, index) {
  return addRow(colorStops, index, COLOR_MAP_TYPE.ORDINAL);
}

export function addCategoricalRow(colorStops, index) {
  return addRow(colorStops, index, COLOR_MAP_TYPE.CATEGORICAL);
}

export function addRow(colorStops, index, colorMapType) {
  const currentStop = colorStops[index].stop;
  let delta = 1;
  if (index === colorStops.length - 1) {
    // Adding row to end of list.
    if (index !== 0) {
      const prevStop = colorStops[index - 1].stop;
      delta = currentStop - prevStop;
    }
  } else {
    // Adding row in middle of list.
    const nextStop = colorStops[index + 1].stop;
    delta = (nextStop - currentStop) / 2;
  }

  const nextValue = colorMapType === COLOR_MAP_TYPE.ORDINAL ? currentStop + delta : currentStop;
  const newRow = {
    stop: nextValue,
    color: '#FF0000',
  };
  return [...colorStops.slice(0, index + 1), newRow, ...colorStops.slice(index + 1)];
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

export function getColorInput(colorStops, onColorChange, color) {
  return {
    colorError: isColorInvalid(color)
      ? i18n.translate('xpack.maps.styles.colorStops.hexWarningLabel', {
          defaultMessage: 'Color must provide a valid hex value',
        })
      : undefined,
    colorInput: <EuiColorPicker onChange={onColorChange} color={color} compressed />,
  };
}

export function getColorStopRow({ index, errors, stopInput, colorInput, deleteButton, onAdd }) {
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

export function isColorInvalid(color) {
  return !isValidHex(color) || color === '';
}

export function isOrdinalStopInvalid(stop) {
  return stop === '' || isNaN(stop);
}

export function isCategoricalStopsInvalid(colorStops) {
  const nonDefaults = colorStops.slice(1); //
  const values = nonDefaults.map(stop => stop.stop);
  const uniques = _.uniq(values);
  return values.length !== uniques.length;
}

export function isOrdinalStopsInvalid(colorStops) {
  return colorStops.some((colorStop, index) => {
    // expect stops to be in ascending order
    let isDescending = false;
    if (index !== 0) {
      const prevStop = colorStops[index - 1].stop;
      isDescending = prevStop >= colorStop.stop;
    }

    return isColorInvalid(colorStop.color) || isOrdinalStopInvalid(colorStop.stop) || isDescending;
  });
}

export function getOtherCategoryLabel() {
  return i18n.translate('xpack.maps.styles.categorical.otherCategoryLabel', {
    defaultMessage: 'Other',
  });
}

export const DEFAULT_CUSTOM_COLOR = '#FF0000';
export const DEFAULT_NEXT_COLOR = '#00FF00';
