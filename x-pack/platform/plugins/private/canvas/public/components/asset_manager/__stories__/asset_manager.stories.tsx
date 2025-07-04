/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { reduxDecorator, getAddonPanelParameters } from '../../../../storybook';

import { AssetManager, AssetManagerComponent } from '..';
import { assets } from './assets';

const promiseAction =
  (actionName: string) =>
  (...args: any[]): Promise<string | void> => {
    action(actionName)(...args);
    return Promise.resolve();
  };

export default {
  title: 'components/Assets/AssetManager',
  decorators: [reduxDecorator({ assets })],
  parameters: getAddonPanelParameters(),
};

export const ReduxAssetManager = {
  render: () => <AssetManager onClose={action('onClose')} />,
  name: 'redux: AssetManager',
};

export const NoAssets = {
  render: () => (
    <AssetManagerComponent
      assets={[]}
      onClose={action('onClose')}
      onAddAsset={promiseAction('onAddAsset')}
    />
  ),

  name: 'no assets',
};

export const TwoAssets = {
  render: () => (
    <AssetManagerComponent
      assets={assets}
      onClose={action('onClose')}
      onAddAsset={promiseAction('onAddAsset')}
    />
  ),

  name: 'two assets',
};
