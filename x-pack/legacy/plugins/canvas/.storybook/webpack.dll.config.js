/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const { DLL_NAME, DLL_OUTPUT, KIBANA_ROOT } = require('./constants');

// This is the Webpack config for the DLL of CSS and JS assets that are
// not expected to change during development.  This saves compile and run
// times considerably.
module.exports = {
  context: KIBANA_ROOT,
  mode: 'development',

  // This is a (potentially growing) list of modules that can be safely
  // included in the DLL.  Only add to this list modules or other code
  // which Storybook stories and their components would require, but don't
  // change during development.
  entry: [
    '@elastic/eui/dist/eui_theme_light.css',
    '@kbn/ui-framework/dist/kui_light.css',
    '@storybook/addon-actions/register',
    '@storybook/addon-knobs',
    '@storybook/addon-knobs/react',
    '@storybook/addon-knobs/register',
    '@storybook/core',
    '@storybook/core/dist/server/common/polyfills.js',
    '@storybook/react',
    '@storybook/theming',
    'angular-mocks',
    'angular',
    'brace',
    'chroma-js',
    'highlight.js',
    'html-entities',
    'jquery',
    'lodash.clone',
    'lodash',
    'markdown-it',
    'mocha',
    'monaco-editor',
    'prop-types',
    'react-ace',
    'react-beautiful-dnd',
    'react-dom',
    'react-focus-lock',
    'react-markdown',
    'react-monaco-editor',
    'react-resize-detector',
    'react-virtualized',
    'react',
    'recompose',
    'redux-actions',
    'remark-parse',
    'rxjs',
    'sinon',
    'tinycolor2',
    // Include the DLL UI contexts from Kibana
    require.resolve('./dll_contexts'),
  ],
  plugins: [
    // Produce the DLL and its manifest
    new webpack.DllPlugin({
      name: DLL_NAME,
      path: path.resolve(DLL_OUTPUT, 'manifest.json'),
    }),
    // Produce the DLL CSS file
    new MiniCssExtractPlugin({
      filename: 'dll.css',
    }),
  ],
  // Output the DLL JS file
  output: {
    path: DLL_OUTPUT,
    filename: 'dll.js',
    library: DLL_NAME,
  },
  // Include a require alias for legacy UI code and styles
  resolve: {
    alias: {
      ui: path.resolve(KIBANA_ROOT, 'src/legacy/ui/public'),
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {},
          },
          { loader: 'css-loader' },
          {
            loader: 'string-replace-loader',
            options: {
              search: '__REPLACE_WITH_PUBLIC_PATH__',
              replace: '/',
              flags: 'g',
            },
          },
        ],
      },
      {
        test: /\.less$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader', options: { importLoaders: 2 } },
          {
            loader: 'postcss-loader',
            options: {
              config: {
                path: path.resolve(KIBANA_ROOT, 'src/optimize/postcss.config.js'),
              },
            },
          },
          { loader: 'less-loader' },
        ],
      },
      {
        test: /\.(woff|woff2|ttf|eot|svg|ico)(\?|$)/,
        loader: 'file-loader',
      },
    ],
  },
  node: {
    fs: 'empty',
    child_process: 'empty',
  },
};
