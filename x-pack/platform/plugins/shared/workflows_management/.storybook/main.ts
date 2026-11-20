/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import type { Configuration } from 'webpack';
import { merge as webpackMerge } from 'webpack-merge';
import type { StorybookConfig } from '@kbn/storybook';
import { defaultConfig } from '@kbn/storybook';

const webpackConfig: Configuration = {
  resolve: {
    alias: {
      '../../../hooks/use_workflow_url_state': resolve(
        __dirname,
        '../public/hooks/use_workflow_url_state.mock.ts'
      ),
    },
  },
};

const sbConfig: StorybookConfig = {
  ...defaultConfig,
  webpackFinal(config, options) {
    return webpackMerge(defaultConfig.webpackFinal?.(config, options) ?? {}, webpackConfig);
  },
};

// eslint-disable-next-line import/no-default-export
export default sbConfig;
