/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiLink, PopoverAnchorPosition } from '@elastic/eui';
import chroma from 'chroma-js';
import { Popover } from '../popover';
import { ColorDot } from '../color_dot';
import { ColorPicker, Props as ColorPickerProps } from '../color_picker';

export interface Props extends ColorPickerProps {
  anchorPosition?: PopoverAnchorPosition;
  ariaLabel?: string;
}

export const ColorPickerPopover: FC<Props> = (props: Props) => {
  const { value, anchorPosition, ariaLabel, ...rest } = props;
  const button = (handleClick: React.MouseEventHandler<HTMLButtonElement>) => (
    <EuiLink
      aria-label={`${ariaLabel} ${value ? chroma(value).name() : value}`}
      css={{ fontSize: 0 }}
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
