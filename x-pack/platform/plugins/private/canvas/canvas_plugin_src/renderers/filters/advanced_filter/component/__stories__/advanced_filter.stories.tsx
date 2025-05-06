/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { AdvancedFilter } from '../advanced_filter';

export default {
  title: 'renderers/AdvancedFilter',
};

export const Default = {
  render: () => <AdvancedFilter onChange={action('onChange')} commit={action('commit')} />,

  name: 'default',
};

export const WithValue = {
  render: () => (
    <AdvancedFilter onChange={action('onChange')} commit={action('commit')} value="expression" />
  ),

  name: 'with value',
};
