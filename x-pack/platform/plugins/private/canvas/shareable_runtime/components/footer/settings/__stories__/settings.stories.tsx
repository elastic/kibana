/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ExampleContext } from '../../../../test/context_example';

import { Settings, SettingsComponent } from '../settings';
import { initialCanvasShareableState } from '../../../../context';

export default {
  title: 'shareables/Footer/Settings',
};

export const Contextual = {
  render: () => (
    <ExampleContext style={{ background: '#333', padding: 10 }}>
      <Settings />
    </ExampleContext>
  ),

  name: 'contextual',
};

export const Component = {
  render: () => (
    <ExampleContext style={{ background: '#333', padding: 10 }}>
      <SettingsComponent refs={initialCanvasShareableState.refs} />
    </ExampleContext>
  ),

  name: 'component',
};
