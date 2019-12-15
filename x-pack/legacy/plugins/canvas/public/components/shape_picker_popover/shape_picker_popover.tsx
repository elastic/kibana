/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEvent } from 'react';
import PropTypes from 'prop-types';
import { EuiLink, EuiPanel } from '@elastic/eui';
import { Popover } from '../popover';
import { ShapePicker } from '../shape_picker';
import { ShapePreview } from '../shape_preview';

interface Props {
  shapes: {
    [key: string]: string;
  };
  onChange?: (key: string) => void;
  value?: string;
}

export const ShapePickerPopover = ({ shapes, onChange, value }: Props) => {
  const button = (handleClick: (ev: MouseEvent) => void) => (
    <EuiPanel paddingSize="s" hasShadow={false}>
      <EuiLink style={{ fontSize: 0 }} onClick={handleClick}>
        <ShapePreview shape={value ? shapes[value] : undefined} />
      </EuiLink>
    </EuiPanel>
  );

  return (
    <Popover panelClassName="canvas" button={button}>
      {() => <ShapePicker onChange={onChange} shapes={shapes} />}
    </Popover>
  );
};

ShapePickerPopover.propTypes = {
  shapes: PropTypes.object.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func,
};
