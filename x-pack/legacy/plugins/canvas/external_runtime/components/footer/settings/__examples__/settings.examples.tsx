/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { Context } from '../../../../context/mock';

import { AutoplaySettings } from '../autoplay_settings.container';
import { Settings } from '../settings.container';
import { ToolbarSettings } from '../toolbar_settings.container';

storiesOf('runtime/Settings', module)
  .add('Settings', () => (
    <Context style={{ background: '#333', padding: 10 }}>
      <Settings />
    </Context>
  ))
  .add('AutoplaySettings', () => (
    <Context width={250} style={{ background: '#fff' }}>
      <AutoplaySettings />
    </Context>
  ))
  .add('ToolbarSettings', () => (
    <Context width={250} style={{ background: '#fff' }}>
      <ToolbarSettings />
    </Context>
  ));
