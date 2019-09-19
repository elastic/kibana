/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { TestingContext } from '../../../../test';

import { AutoplaySettings } from '../autoplay_settings.container';
import { Settings } from '../settings.container';
import { ToolbarSettings } from '../toolbar_settings.container';

storiesOf('runtime/Settings', module)
  .add('Settings', () => (
    <TestingContext style={{ background: '#333', padding: 10 }}>
      <Settings />
    </TestingContext>
  ))
  .add('AutoplaySettings', () => (
    <TestingContext width={250} style={{ background: '#fff' }}>
      <AutoplaySettings />
    </TestingContext>
  ))
  .add('ToolbarSettings', () => (
    <TestingContext width={250} style={{ background: '#fff' }}>
      <ToolbarSettings />
    </TestingContext>
  ));
