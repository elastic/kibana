/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Task pod builds resolve `@kbn/repo-info` here. The real module walks up from its own directory
 * to find a Kibana checkout's `package.json` at import time and throws if there is none, which is
 * the case for a pod deployed on its own. Packages that read it (for default config/data/log
 * directories, the version) get values that make sense for a standalone process instead.
 */
import Path from 'path';

declare const __POD_BUILD_VERSION__: string | undefined;
const version =
  process.env.POD_KIBANA_VERSION ??
  (typeof __POD_BUILD_VERSION__ !== 'undefined' ? __POD_BUILD_VERSION__ : '0.0.0');

export const REPO_ROOT = process.env.POD_ROOT ?? process.cwd();
export const PKG_JSON = {
  name: 'kibana',
  version,
  branch: process.env.POD_KIBANA_BRANCH ?? 'main',
  build: { distributable: true, number: 0, sha: 'pod' },
};
export const kibanaPackageJson = PKG_JSON;
export const UPSTREAM_BRANCH = PKG_JSON.branch;
export const isKibanaDistributable = () => true;
export const fromRoot = (...paths: string[]) => Path.resolve(REPO_ROOT, ...paths);
