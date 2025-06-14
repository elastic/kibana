/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import type { Meta } from '@storybook/react';
import { reduxDecorator, getAddonPanelParameters } from '../../../../storybook';
import { Asset, AssetComponent } from '..';
import { AIRPLANE, MARKER, assets } from './assets';

export default {
  title: 'components/Assets/Asset',
  decorators: [
    (story) => <div style={{ width: '215px' }}>{story()}</div>,
    reduxDecorator({ assets }),
  ],
  parameters: getAddonPanelParameters(),
} as Meta;

export const ReduxAsset = {
  render: () => <Asset asset={AIRPLANE} />,
  name: 'redux: Asset',
};

export const Airplane = {
  render: () => (
    <AssetComponent asset={AIRPLANE} onCreate={action('onCreate')} onDelete={action('onDelete')} />
  ),

  name: 'airplane',
};

export const Marker = {
  render: () => (
    <AssetComponent asset={MARKER} onCreate={action('onCreate')} onDelete={action('onDelete')} />
  ),

  name: 'marker',
};
