/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { defaultConfig, mergeWebpackFinal } from '@kbn/storybook';
import type { StorybookConfig } from '@kbn/storybook';
import { Configuration } from 'webpack';
import { KIBANA_ROOT } from './constants';

export const canvasWebpack: Configuration = {
  module: {
    rules: [
      // Enable CSS Modules in Storybook (Shareable Runtime)
      {
        test: /\.module\.s(a|c)ss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 2,
              modules: {
                localIdentName: '[name]__[local]___[hash:base64:5]',
              },
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                config: resolve(KIBANA_ROOT, 'packages/kbn-optimizer/postcss.config.js'),
              },
            },
          },
          {
            loader: 'sass-loader',
            options: {
              implementation: require('sass-embedded'),
              sassOptions: {
                quietDeps: true,
              },
            },
          },
        ],
      },
    ],
  },
  resolve: {
    alias: {
      'src/plugins': resolve(KIBANA_ROOT, 'src/plugins'),
      // Exclude large-dependency, troublesome or irrelevant modules.
      [resolve(KIBANA_ROOT, 'x-pack/plugins/canvas/public/components/embeddable_flyout')]: false,
      [resolve(KIBANA_ROOT, 'x-pack/plugins/reporting/public')]: false,
    },
  },
};

export const canvasStorybookConfig: StorybookConfig = {
  ...defaultConfig,
  addons: [...(defaultConfig.addons || []), require.resolve('./addon/register')],
  ...mergeWebpackFinal(canvasWebpack),
};
