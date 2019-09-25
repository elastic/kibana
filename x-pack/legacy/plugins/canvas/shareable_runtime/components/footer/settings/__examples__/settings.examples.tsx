/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ExampleContext } from '../../../../test/context_example';

import { AutoplaySettingsContainer } from '../autoplay_settings.container';
import { SettingsContainer } from '../settings.container';
import { ToolbarSettingsContainer } from '../toolbar_settings.container';

storiesOf('shareable/Settings', module)
  .add('Settings', () => (
    <ExampleContext style={{ background: '#333', padding: 10 }}>
      <SettingsContainer />
    </ExampleContext>
  ))
  .add('AutoplaySettings', () => (
    <ExampleContext width={250} style={{ background: '#fff' }}>
      <AutoplaySettingsContainer />
    </ExampleContext>
  ))
  .add('ToolbarSettings', () => (
    <ExampleContext width={250} style={{ background: '#fff' }}>
      <ToolbarSettingsContainer onSetAutohide={action('onSetAutohide')} />
    </ExampleContext>
  ));
