/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import type { Meta } from '@storybook/react';
import { ElementControls } from '../element_controls';

export default {
  title: 'components/SavedElementsModal/ElementControls',

  decorators: [
    (story) => (
      <div
        style={{
          width: '50px',
        }}
      >
        {story()}
      </div>
    ),
  ],
} as Meta;

export const HasTwoButtons = {
  render: () => <ElementControls onDelete={action('onDelete')} onEdit={action('onEdit')} />,

  name: 'has two buttons',
};
