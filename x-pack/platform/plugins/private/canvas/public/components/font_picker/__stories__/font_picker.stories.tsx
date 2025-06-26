/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { americanTypewriter } from '../../../../common/lib/fonts';
import { FontPicker } from '../font_picker';

export default {
  title: 'components/FontPicker',
};

export const Default = {
  render: () => <FontPicker onSelect={action('onSelect')} />,
  name: 'default',
};

export const WithValue = {
  render: () => <FontPicker onSelect={action('onSelect')} value={americanTypewriter.value} />,

  name: 'with value',
};
