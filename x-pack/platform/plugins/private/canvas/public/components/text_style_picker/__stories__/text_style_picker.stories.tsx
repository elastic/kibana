/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { action } from '@storybook/addon-actions';
import type { Meta } from '@storybook/react';

import { TextStylePicker, StyleProps } from '../text_style_picker';

const Interactive = () => {
  const [style, setStyle] = useState<StyleProps>({});
  const onChange = (styleChange: StyleProps) => {
    setStyle(styleChange);
    action('onChange')(styleChange);
  };
  return <TextStylePicker onChange={onChange} {...style} />;
};

export default {
  title: 'components/TextStylePicker',
  decorators: [(fn) => <div style={{ width: 264 }}>{fn()}</div>],
} as Meta;

export const Default = {
  render: () => <TextStylePicker onChange={action('onChange')} />,
  name: 'default',
};

export const _Interactive = {
  render: () => <Interactive />,
  name: 'interactive',
};
