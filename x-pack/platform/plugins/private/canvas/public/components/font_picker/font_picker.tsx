/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiSuperSelect } from '@elastic/eui';
import { fonts, FontValue } from '../../../common/lib/fonts';

interface DisplayedFont {
  label: string;
  value: string;
}

interface Props {
  onSelect?: (value: DisplayedFont['value']) => void;
  value?: FontValue;
}

export const FontPicker: FC<Props> = ({ value, onSelect }) => {
  // While fonts are strongly-typed, we also support custom fonts someone might type in.
  // So let's cast the fonts and allow for additions.
  const displayedFonts: DisplayedFont[] = fonts;

  if (value && !fonts.find((font) => font.value === value)) {
    const label = (value.indexOf(',') >= 0 ? value.split(',')[0] : value).replace(/['"]/g, '');
    displayedFonts.push({ value, label });
    displayedFonts.sort((a, b) => a.label.localeCompare(b.label));
  }

  return (
    <EuiSuperSelect
      compressed
      options={displayedFonts.map((font) => ({
        value: font.value,
        inputDisplay: <div style={{ fontFamily: font.value }}>{font.label}</div>,
      }))}
      valueOfSelected={value}
      onChange={(newValue: DisplayedFont['value']) => onSelect && onSelect(newValue)}
    />
  );
};

FontPicker.propTypes = {
  /** Function to execute when a Font is selected. */
  onSelect: PropTypes.func,
  /** Initial value of the Font Picker. */
  value: PropTypes.string,
};

FontPicker.displayName = 'FontPicker';
