/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { args } from './src/args';
export { ChromiumArchivePaths, type PackageInfo } from './src/paths';
export { getChromiumPackage } from './src/get_chromium_package';
export { type ConfigType, createConfig, config, durationToNumber } from './src/config';
export { ConfigSchema } from './src/config/schema';
