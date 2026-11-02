/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stage B3: size-only entry. Not a pod — `build.mjs` targets it purely to produce a metafile for
 * `analyze_meta.mjs`. See pod/entries/size_only_all_connectors.ts.
 */
export * from './entries/size_only_all_connectors';
