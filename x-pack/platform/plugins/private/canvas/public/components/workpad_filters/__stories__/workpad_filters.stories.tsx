/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta } from '@storybook/react';
import { reduxDecorator } from '../../../../storybook';
import { WorkpadFilters } from '../workpad_filters';
import { elementWithGroup, elements } from './elements';

export default {
  title: 'components/WorkpadFilters/WorkpadFilters',

  decorators: [
    (story) => (
      <div>
        <div className="canvasLayout__sidebar">
          <div style={{ width: '100%' }}>{story()}</div>
        </div>
      </div>
    ),
    reduxDecorator({ elements }),
  ],
} as Meta;

export const ReduxDefault = {
  render: () => <WorkpadFilters />,
  name: 'redux: default',
};

export const ReduxSelectedElementWithGroup = {
  render: () => <WorkpadFilters element={elementWithGroup} />,
  name: 'redux: selected element with group',
};
