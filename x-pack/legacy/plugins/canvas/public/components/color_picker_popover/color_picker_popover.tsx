/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, PopoverAnchorPosition } from '@elastic/eui';
import PropTypes from 'prop-types';
import React, { FunctionComponent, MouseEvent } from 'react';
import { ColorDot } from '../color_dot';
import { ColorPicker, ColorPickerComponent, ColorPickerComponentProps } from '../color_picker';
import { Popover } from '../popover';

export interface Props extends ColorPickerComponentProps {
  anchorPosition: PopoverAnchorPosition;
}

export const ColorPickerPopoverComponent: FunctionComponent<Props> = ({
  value,
  anchorPosition,
  ...rest
}) => {
  const button = (handleClick: (ev: MouseEvent) => void) => (
    <EuiLink style={{ fontSize: 0 }} onClick={handleClick}>
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

ColorPickerPopoverComponent.propTypes = {
  ...ColorPickerComponent.propTypes,
  anchorPosition: PropTypes.string,
};

export const ColorPickerPopover = React.memo(ColorPickerPopoverComponent);

ColorPickerPopover.displayName = 'ColorPickerPopover';
