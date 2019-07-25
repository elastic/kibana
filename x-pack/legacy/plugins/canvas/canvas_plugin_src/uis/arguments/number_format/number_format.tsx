/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, ChangeEvent, FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { EuiSelect, EuiFieldText, EuiSpacer } from '@elastic/eui';
import { number } from 'hapi/node_modules/@types/joi';

interface NumberFormatOption {
  /** a NumeralJS format string */
  value: string;
  /** the name to display for the format */
  text: string;
}

export interface Props {
  /** array of number formats options */
  numberFormats: NumberFormatOption[];
  /** handler to invoke when value changes */
  onValueChange: (value: string) => void;
  /** value of the argument */
  argValue: string;
  /** the ID for the argument */
  argId: string;
}

export const NumberFormatArgInput: FunctionComponent<Props> = ({
  numberFormats,
  onValueChange,
  argValue,
  argId,
}) => {
  const formatOptions = numberFormats.concat({ value: '', text: 'Custom' });
  const handleTextChange = (ev: ChangeEvent<HTMLInputElement>) => onValueChange(ev.target.value);
  const handleSelectChange = (ev: ChangeEvent<HTMLSelectElement>) => {
    const { value } = formatOptions[ev.target.selectedIndex];
    return onValueChange(value);
  };

  // checks if the argValue is one of the preset formats
  const isCustomFormat = !argValue || !formatOptions.map(({ value }) => value).includes(argValue);

  return (
    <Fragment>
      <EuiSelect
        compressed
        id={argId}
        value={isCustomFormat ? '' : argValue}
        options={formatOptions}
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
  argId: PropTypes.string.isRequired,
};
