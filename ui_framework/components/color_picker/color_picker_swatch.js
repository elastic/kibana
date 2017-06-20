import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { KuiColorPickerEmptySwatch } from './color_picker_empty_swatch';

export function KuiColorPickerSwatch(props) {
  const { color, className } = props;
  const classes = classNames('kuiColorPicker__swatch', className);

  if (!color) {
    return <KuiColorPickerEmptySwatch aria-label={ props['aria-label'] } />;
  }

  return (
    <div
      className={ classes }
      aria-label={ props['aria-label'] }
      data-test-subj="colorSwatch"
      style={{ background: color }}
    />
  );
}

KuiColorPickerSwatch.propTypes = {
  className: PropTypes.string,
  color: PropTypes.string,
};

