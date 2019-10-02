/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ExampleContext } from '../../../../test/context_example';

import { AutoplaySettings } from '../autoplay_settings';
import { Settings } from '../settings';
import { ToolbarSettings } from '../toolbar_settings';

storiesOf('shareables/Settings', module)
  .add('Settings', () => (
    <ExampleContext style={{ background: '#333', padding: 10 }}>
      <Settings />
    </ExampleContext>
  ))
  .add('AutoplaySettings', () => (
    <ExampleContext width={250} style={{ background: '#fff' }}>
      <AutoplaySettings />
    </ExampleContext>
  ))
  .add('ToolbarSettings', () => (
    <ExampleContext width={250} style={{ background: '#fff' }}>
      <ToolbarSettings onSetAutohide={action('onSetAutohide')} />
    </ExampleContext>
  ));
