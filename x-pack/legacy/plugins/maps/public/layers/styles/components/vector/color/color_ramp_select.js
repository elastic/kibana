/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { EuiSuperSelect } from '@elastic/eui';
import { COLOR_GRADIENTS } from '../../../color_utils';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiColorStops } from './color_stops';

const CUSTOM_COLOR_RAMP = 'CUSTOM_COLOR_RAMP';

export function ColorRampSelect({ color, customColorRamp, onChange, useCustomColorRamp }) {
  const onColorRampChange = (selectedValue) => {
    const useCustomColorRamp = selectedValue === CUSTOM_COLOR_RAMP;
    onChange({
      color: useCustomColorRamp ? null : selectedValue,
      useCustomColorRamp
    });
  };

  const onCustomColorRampChange = ({ colorStops, isInvalid }) => {
    onChange({
      customColorRamp: colorStops
    });
  };

  let colorStopsInput;
  if (useCustomColorRamp) {
    colorStopsInput = (
      <EuiColorStops
        colorStops={customColorRamp}
        onChange={onCustomColorRampChange}
      />
    );
  }

  const colorRampOptions = [
    {
      value: CUSTOM_COLOR_RAMP,
      inputDisplay: (
        <FormattedMessage
          id="xpack.maps.style.customColorRampLabel"
          defaultMessage="Custom color ramp"
        />
      )
    },
    ...COLOR_GRADIENTS
  ];

  return (
    <>
      <EuiSuperSelect
        options={colorRampOptions}
        onChange={onColorRampChange}
        valueOfSelected={useCustomColorRamp ? CUSTOM_COLOR_RAMP : color}
        hasDividers={true}
      />
      {colorStopsInput}
    </>
  );
}

ColorRampSelect.propTypes = {
  color: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};
