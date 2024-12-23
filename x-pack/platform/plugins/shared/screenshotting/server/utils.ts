/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromiumArchivePaths } from '@kbn/screenshotting-server';
import { download as baseDownload, install as baseInstall } from './browsers';

const paths = new ChromiumArchivePaths();

export const download = baseDownload.bind(undefined, paths);
export const install = baseInstall.bind(undefined, paths);

export { paths };
