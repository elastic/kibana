/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, PopoverAnchorPosition } from '@elastic/eui';
import PropTypes from 'prop-types';
import React, { FunctionComponent } from 'react';
import tinycolor from 'tinycolor2';
import { ColorDot } from '../color_dot';
import { ColorPicker, Props as ColorPickerProps } from '../color_picker';
import { Popover } from '../popover';

export interface Props extends ColorPickerProps {
  anchorPosition: PopoverAnchorPosition;
  ariaLabel?: string;
}

export const ColorPickerPopover: FunctionComponent<Props> = (props: Props) => {
  const { value, anchorPosition, ariaLabel, ...rest } = props;
  const button = (handleClick: React.MouseEventHandler<HTMLButtonElement>) => (
    <EuiLink
      aria-label={`${ariaLabel} ${tinycolor(value).toName() || value}`}
      style={{ fontSize: 0 }}
      onClick={handleClick}
    >
      <ColorDot value={value} />
    </EuiLink>
  );

  return (
    <Popover
      id="color-picker-popover"
      panelClassName="canvas canvasColorPickerPopover__popover"
      button={button}
      anchorPosition={anchorPosition}
    >
      {() => <ColorPicker value={value} {...rest} />}
    </Popover>
  );
};

ColorPickerPopover.propTypes = {
  ...ColorPicker.propTypes,
  anchorPosition: PropTypes.string,
};
