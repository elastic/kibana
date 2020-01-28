/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { Datatable } from '../../../../types';
import { Csv } from '../component';

const demodata: Datatable = {
  type: 'datatable',
  columns: [
    { name: 'this', type: 'string' },
    { name: 'is', type: 'string' },
    { name: 'a', type: 'string' },
    { name: 'datatable', type: 'string' },
  ],
  rows: [
    {
      this: "it's",
      is: 'in',
      a: 'CSV',
      datatable: 'format',
    },
    {
      this: 'hover',
      is: 'me',
      a: 'to',
      datatable: 'download',
    },
  ],
};

storiesOf('renderers/Csv', module).add('default', () => (
  <Csv datatable={demodata} height={200} width={400} />
));
