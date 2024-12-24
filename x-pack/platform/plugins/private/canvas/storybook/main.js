/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canvasStorybookConfig } from './canvas_webpack';

module.exports = canvasStorybookConfig;

// This file wsa converted to .js again because of ts-node causing issues with
// storybook typescript setup, this is more or less relevant to
// https://github.com/storybookjs/storybook/issues/9610
// ts usage was moved to separate file canvas.webpack.ts, keep this file only was module.exports
