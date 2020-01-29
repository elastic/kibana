/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Datatable } from '../../../../types';
import { MultiFilter } from '../component';

const demodata: Datatable = {
  type: 'datatable',
  columns: [
    { name: 'country', type: 'string' },
    { name: 'size', type: 'string' },
    { name: 'level', type: 'string' },
  ],
  rows: [
    {
      country: 'USA',
      size: 'large',
      level: 'gold',
    },
    {
      country: 'USA',
      size: 'small',
      level: 'platinum',
    },
    {
      country: 'Canada',
      size: 'medium',
      level: 'gold',
    },
    {
      country: 'Mexico',
      size: 'large',
      level: 'bronze',
    },
    {
      country: 'Ecuador',
      size: 'small',
      level: 'silver',
    },
    {
      country: 'USA',
      size: 'USA',
      level: 'USA',
    },
  ],
};

storiesOf('renderers/MultiFilter', module).add('default', () => (
  <MultiFilter datatable={demodata} onChange={action('onChange')} />
));
