/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stands in for `@kbn/repo-info` in the bundle: there is no Kibana checkout in the image, only the assets
// `bundle.js` copies under `dist/kibana` at their checkout paths (fonts, the world outlines fixture).

import { join, resolve } from 'node:path';

export const REPO_ROOT = process.env.ISOMER_RENDER_ASSETS || join(__dirname, 'kibana');

export const fromRoot = (...paths: string[]): string => resolve(REPO_ROOT, ...paths);

export const kibanaPackageJson = { name: 'kibana', version: '0.0.0', branch: 'unknown' };

export const isKibanaDistributable = () => true;
