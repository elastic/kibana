/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import { ColorDot } from '../color_dot';

export default {
  title: 'components/Color/ColorDot',

  parameters: {
    info: { propTablesExclude: [EuiIcon] },
  },
};

export const ColorDots = {
  render: () => (
    <>
      <ColorDot key="1" value="white" />
      <ColorDot key="2" value="#000" />
      <ColorDot key="3" value="#abcd" />
      <ColorDot key="4" value="#aabbcc" />
      <ColorDot key="5" value="#aabbccdd" />
      <ColorDot key="6" value="rgb(100, 150, 250)" />
      <ColorDot key="7" value="rgba(100, 150, 250, .5)" />
    </>
  ),

  name: 'color dots',
};

export const InvalidDots = {
  render: () => (
    <>
      <ColorDot key="1" value="elastic" />
      <ColorDot key="2" value="#xyz" />
      <ColorDot key="3" value="#ghij" />
      <ColorDot key="4" value="#canvas" />
      <ColorDot key="5" value="#12345xyz" />
      <ColorDot key="6" value="rgb(a,b,c)" />
      <ColorDot key="7" value="rgba(w,x,y,z)" />
    </>
  ),

  name: 'invalid dots',
};

export const ColorDotsWithChildren = {
  render: () => (
    <>
      <ColorDot key="1" value="#FFF">
        <EuiIcon type="plusInCircle" color="#000" />
      </ColorDot>
      <ColorDot key="2" value="#666">
        <EuiIcon type="minusInCircle" color="#fff" />
      </ColorDot>
      <ColorDot key="3" value="rgba(100, 150, 250, .5)">
        <EuiIcon type="warning" color="#fff" />
      </ColorDot>
      <ColorDot key="4" value="#000">
        <EuiIcon type="check" color="#fff" />
      </ColorDot>
    </>
  ),

  name: 'color dots with children',
};
