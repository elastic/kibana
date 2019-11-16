/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, PopoverAnchorPosition } from '@elastic/eui';
import React, { MouseEvent } from 'react';
import { ColorDot } from '../color_dot';
import { ColorPicker, Props as ColorPickerProps } from '../color_picker';
import { Popover } from '../popover';

export interface Props extends ColorPickerProps {
  anchorPosition: PopoverAnchorPosition;
}

export const ColorPickerPopover = React.memo<Props>(({ value, anchorPosition, ...rest }) => {
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
});

ColorPickerPopover.displayName = 'ColorPickerPopover';
