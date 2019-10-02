/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { AutoplaySettingsComponent } from '../autoplay_settings';
import { ToolbarSettingsComponent } from '../toolbar_settings';

storiesOf('shareables/Settings/components', module)
  .add('AutoplaySettings, autoplay disabled', () => (
    <AutoplaySettingsComponent
      onSetAutoplay={action('onSetAutoplay')}
      isEnabled={false}
      interval="5s"
      onSetInterval={action('onSetInterval')}
    />
  ))
  .add('AutoplaySettings, autoplay enabled', () => (
    <AutoplaySettingsComponent
      onSetAutoplay={action('onSetAutoplay')}
      isEnabled={true}
      interval="5s"
      onSetInterval={action('onSetInterval')}
    />
  ))
  .add('ToolbarSettings, autohide enabled', () => (
    <ToolbarSettingsComponent onSetAutohide={action('onSetInterval')} isAutohide={true} />
  ))
  .add('ToolbarSettings, autohide disabled', () => (
    <ToolbarSettingsComponent onSetAutohide={action('onSetInterval')} isAutohide={false} />
  ));
