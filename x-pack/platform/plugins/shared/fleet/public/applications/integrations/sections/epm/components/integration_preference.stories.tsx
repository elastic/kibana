/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta } from '@storybook/react';

import { action } from '@storybook/addon-actions';

import { IntegrationPreference as Component } from './integration_preference';

export default {
  title: 'Sections/EPM/Integration Preference',
  description: '',
  decorators: [
    (storyFn, { globals }) => (
      <div
        style={{
          padding: 40,
          backgroundColor: globals.euiTheme === 'borealis.dark' ? '#0B1628' : '#FFF',
          width: 280,
        }}
      >
        {storyFn()}
      </div>
    ),
  ],
} as Meta;

export const IntegrationPreference = () => {
  return <Component initialType="agent" onChange={action('onChange')} />;
};
