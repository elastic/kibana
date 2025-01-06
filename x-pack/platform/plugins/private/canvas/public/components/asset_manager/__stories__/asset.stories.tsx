/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { reduxDecorator, getAddonPanelParameters } from '../../../../storybook';
import { Asset, AssetComponent } from '..';
import { AIRPLANE, MARKER, assets } from './assets';

storiesOf('components/Assets/Asset', module)
  .addDecorator((story) => <div style={{ width: '215px' }}>{story()}</div>)
  .addDecorator(reduxDecorator({ assets }))
  .addParameters(getAddonPanelParameters())
  .add('redux: Asset', () => {
    return <Asset asset={AIRPLANE} />;
  })
  .add('airplane', () => (
    <AssetComponent asset={AIRPLANE} onCreate={action('onCreate')} onDelete={action('onDelete')} />
  ))
  .add('marker', () => (
    <AssetComponent asset={MARKER} onCreate={action('onCreate')} onDelete={action('onDelete')} />
  ));
