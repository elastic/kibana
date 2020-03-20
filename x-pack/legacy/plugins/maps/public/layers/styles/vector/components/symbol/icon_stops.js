/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DEFAULT_ICON } from '../../../../../../common/constants';
import { i18n } from '@kbn/i18n';
import { getOtherCategoryLabel } from '../../style_util';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiFieldText } from '@elastic/eui';
import { IconSelect } from './icon_select';
import { StopInput } from '../stop_input';

function isDuplicateStop(targetStop, iconStops) {
  const stops = iconStops.filter(({ stop }) => {
    return targetStop === stop;
  });
  return stops.length > 1;
}

const DEFAULT_ICON_STOPS = [
  { stop: null, icon: DEFAULT_ICON }, //first stop is the "other" color
  { stop: '', icon: DEFAULT_ICON },
];

export function IconStops({
  field,
  getValueSuggestions,
  iconStops = DEFAULT_ICON_STOPS,
  isDarkMode,
  onChange,
  symbolOptions,
}) {
  return iconStops.map(({ stop, icon }, index) => {
    const onIconSelect = selectedIconId => {
      const newIconStops = [...iconStops];
      newIconStops[index] = {
        ...iconStops[index],
        icon: selectedIconId,
      };
      onChange({ customMapStops: newIconStops });
    };
    const onStopChange = newStopValue => {
      const newIconStops = [...iconStops];
      newIconStops[index] = {
        ...iconStops[index],
        stop: newStopValue,
      };
      onChange({
        customMapStops: newIconStops,
        isInvalid: isDuplicateStop(newStopValue, iconStops),
      });
    };
    const onAdd = () => {
      onChange({
        customMapStops: [
          ...iconStops.slice(0, index + 1),
          {
            stop: '',
            icon: DEFAULT_ICON,
          },
          ...iconStops.slice(index + 1),
        ],
      });
    };
    const onRemove = () => {
      onChange({
        iconStops: [...iconStops.slice(0, index), ...iconStops.slice(index + 1)],
      });
    };

    let deleteButton;
    if (index > 0) {
      deleteButton = (
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          aria-label={i18n.translate('xpack.maps.styles.iconStops.deleteButtonAriaLabel', {
            defaultMessage: 'Delete',
          })}
          title={i18n.translate('xpack.maps.styles.iconStops.deleteButtonLabel', {
            defaultMessage: 'Delete',
          })}
          onClick={onRemove}
        />
      );
    }

    const errors = [];
    // TODO check for duplicate values and add error messages here

    const stopInput =
      index === 0 ? (
        <EuiFieldText
          aria-label={getOtherCategoryLabel()}
          placeholder={getOtherCategoryLabel()}
          disabled
          compressed
        />
      ) : (
        <StopInput
          key={field.getName()} // force new component instance when field changes
          field={field}
          getValueSuggestions={getValueSuggestions}
          value={stop}
          onChange={onStopChange}
        />
      );

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
            <EuiFlexItem>
              <IconSelect
                isDarkMode={isDarkMode}
                onChange={onIconSelect}
                symbolOptions={symbolOptions}
                value={icon}
              />
            </EuiFlexItem>
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
}
