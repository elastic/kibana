/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import type { ReactNode } from 'react';
import React from 'react';
import {
  EuiSpacer,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type {
  CategoryColorStop,
  OrdinalColorStop,
} from '../../../../../../common/descriptor_types';
import { removeRow, isColorInvalid } from './color_stops_utils';
import { MbValidatedColorPicker } from './mb_validated_color_picker';
import { mapColorStopsStyles } from '../map_color_stops.styles';

interface Props<T extends OrdinalColorStop | CategoryColorStop> {
  onChange: (params: { colorStops: T[]; isInvalid: boolean }) => void;
  colorStops: T[];
  isStopsInvalid: (colorStops: T[]) => boolean;
  getStopError: (stop: T['stop'], index: number) => string | null | undefined;
  renderStopInput: (
    stop: T['stop'],
    onStopChange: (newStopValue: T['stop']) => void,
    index: number
  ) => ReactNode;
  addNewRow: (colorStops: T[], index: number) => T[];
  swatches?: string[];
}

export const ColorStops = <T extends OrdinalColorStop | CategoryColorStop>({
  onChange,
  colorStops,
  isStopsInvalid,
  getStopError,
  renderStopInput,
  addNewRow,
  swatches,
}: Props<T>) => {
  const styles = useMemoCss(mapColorStopsStyles);
  function getStopInput(stop: T['stop'], index: number) {
    const onStopChange = (newStopValue: T['stop']) => {
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

  const rows = colorStops.map((colorStop, index) => {
    const onColorChange = (color: string) => {
      const newColorStops = _.cloneDeep(colorStops);
      newColorStops[index].color = color;
      onChange({
        colorStops: newColorStops,
        isInvalid: isStopsInvalid(newColorStops),
      });
    };

    const { stopError, stopInput } = getStopInput(colorStop.stop, index);

    const color = colorStop.color;

    const colorError = isColorInvalid(color)
      ? i18n.translate('xpack.maps.styles.colorStops.hexWarningLabel', {
          defaultMessage: 'Color must provide a valid hex value',
        })
      : undefined;

    const errors: string[] = [];
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
    if (colorStops.length > 1) {
      const onRemove = () => {
        const newColorStops = removeRow(colorStops, index);
        onChange({
          colorStops: newColorStops,
          isInvalid: isStopsInvalid(newColorStops),
        });
      };
      const deleteLabel = i18n.translate('xpack.maps.styles.colorStops.deleteButtonAriaLabel', {
        defaultMessage: 'Delete',
      });
      deleteButton = (
        <EuiToolTip content={deleteLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            aria-label={deleteLabel}
            onClick={onRemove}
          />
        </EuiToolTip>
      );
    }

    const addLabel = i18n.translate('xpack.maps.styles.colorStops.addButtonAriaLabel', {
      defaultMessage: 'Add row',
    });
    const colorPickerButtons = (
      <div>
        {deleteButton}
        <EuiToolTip content={addLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="plusCircle"
            color="primary"
            aria-label={addLabel}
            onClick={onAdd}
          />
        </EuiToolTip>
      </div>
    );
    return (
      <EuiFormRow
        key={index}
        css={styles.mapColorStops}
        isInvalid={errors.length !== 0}
        error={errors}
        display="rowCompressed"
      >
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={true} className="mapStyleSettings__fixedBox">
            {stopInput}
          </EuiFlexItem>
          <EuiFlexItem>
            <MbValidatedColorPicker
              key={color}
              onChange={onColorChange}
              color={color}
              swatches={swatches}
              append={colorPickerButtons}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  });

  return (
    <div>
      {rows}
      <EuiSpacer size="s" />
    </div>
  );
};
