/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ExampleContext } from '../../../../test/context_example';

import { ToolbarSettings, ToolbarSettingsComponent } from '../toolbar_settings';

const style = {
  width: 256,
  height: 124,
  padding: 16,
  border: '1px solid #ccc',
  background: '#fff',
};

storiesOf('shareables/Footer/Settings/ToolbarSettings', module)
  .add('contextual', () => (
    <ExampleContext {...{ style }}>
      <ToolbarSettings onSetAutohide={action('onSetAutohide')} />
    </ExampleContext>
  ))
  .add('component: on', () => (
    <ExampleContext {...{ style }}>
      <ToolbarSettingsComponent isAutohide={true} onSetAutohide={action('onSetAutohide')} />
    </ExampleContext>
  ))
  .add('component: off', () => (
    <ExampleContext {...{ style }}>
      <ToolbarSettingsComponent isAutohide={false} onSetAutohide={action('onSetAutohide')} />
    </ExampleContext>
  ));
