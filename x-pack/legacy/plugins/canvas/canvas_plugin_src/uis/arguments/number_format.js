/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { EuiSelect, EuiFieldText, EuiSpacer } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { getAdvancedSettings } from '../../../public/lib/kibana_advanced_settings';

const formatMap = {
  NUMBER: getAdvancedSettings().get('format:number:defaultPattern'),
  PERCENT: getAdvancedSettings().get('format:percent:defaultPattern'),
  CURRENCY: getAdvancedSettings().get('format:currency:defaultPattern'),
  DURATION: '00:00:00',
  BYTES: getAdvancedSettings().get('format:bytes:defaultPattern'),
};

const numberFormats = [
  { value: formatMap.NUMBER, text: 'Number' },
  { value: formatMap.PERCENT, text: 'Percent' },
  { value: formatMap.CURRENCY, text: 'Currency' },
  { value: formatMap.DURATION, text: 'Duration' },
  { value: formatMap.BYTES, text: 'Bytes' },
  { value: '', text: 'Custom' },
];

const NumberFormatArgInput = ({ onValueChange, argValue, argId }) => {
  const handleTextChange = ev => onValueChange(ev.target.value);

  const handleSelectChange = ev => {
    // Get the value from the choices passed in since it could be a number or
    // boolean, but ev.target.value is always a string
    const { value } = numberFormats[ev.target.selectedIndex];
    return onValueChange(value);
  };

  const isCustomFormat = !Object.values(formatMap).includes(argValue);

  return (
    <Fragment>
      <EuiSelect
        compressed
        id={argId}
        value={isCustomFormat ? '' : argValue}
        options={numberFormats}
        onChange={handleSelectChange}
      />
      {isCustomFormat && (
        <Fragment>
          <EuiSpacer size="s" />
          <EuiFieldText
            placeholder="0.0a"
            value={argValue}
            compressed
            onChange={handleTextChange}
          />
        </Fragment>
      )}
    </Fragment>
  );
};

NumberFormatArgInput.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]).isRequired,
  typeInstance: PropTypes.shape({
    name: PropTypes.string.isRequired,
    options: PropTypes.shape({
      choices: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string.isRequired,
          value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool])
            .isRequired,
        })
      ).isRequired,
    }),
  }),
  argId: PropTypes.string.isRequired,
};

export const numberFormat = () => ({
  name: 'numberFormat',
  displayName: 'Number Format',
  help: 'Select from the number formats',
  simpleTemplate: templateFromReactComponent(NumberFormatArgInput),
});
