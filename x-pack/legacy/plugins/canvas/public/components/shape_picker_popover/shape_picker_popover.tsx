/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiLink } from '@elastic/eui';
// @ts-ignore untyped local
import { Popover } from '../popover';
import { ShapePicker } from '../shape_picker';
import { ShapePreview } from '../shape_preview';

export enum AnchorPosition {
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right',
}
interface Props {
  shapes: {
    [key: string]: string;
  };
  onChange?: (key: string) => void;
  value?: string;
  anchorPosition?: AnchorPosition;
}

export const ShapePickerPopover = ({ shapes, onChange, value, anchorPosition }: Props) => {
  const button = (handleClick: () => unknown) => (
    <EuiLink style={{ fontSize: 0 }} onClick={handleClick}>
      <ShapePreview shape={value ? shapes[value] : undefined} />
    </EuiLink>
  );

  return (
    <Popover panelClassName="canvas" button={button} anchorPosition={anchorPosition}>
      {() => <ShapePicker onChange={onChange} shapes={shapes} />}
    </Popover>
  );
};

ShapePickerPopover.propTypes = {
  shapes: PropTypes.object.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func,
  anchorPosition: PropTypes.string,
};
