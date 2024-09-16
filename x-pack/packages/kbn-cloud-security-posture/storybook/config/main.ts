/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultConfig } from '@kbn/storybook';

module.exports = {
  ...defaultConfig,
  stories: ['../../**/*.stories.+(tsx|mdx)'],
  reactOptions: {
    strictMode: true,
  },
  webpack: async (config) => {
    config.module.rules.push({
      test: /node_modules[\/\\]@?xyflow[\/\\].*.js$/,
      loaders: 'babel-loader',
      options: {
        presets: [['@babel/preset-env', { modules: false }], '@babel/preset-react'],
        plugins: [
          '@babel/plugin-proposal-optional-chaining',
          '@babel/plugin-proposal-nullish-coalescing-operator',
          '@babel/plugin-transform-logical-assignment-operators',
        ],
      },
    });

    return config;
  },
};
