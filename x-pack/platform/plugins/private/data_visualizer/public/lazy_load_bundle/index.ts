/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResultLinks } from '../../common/app';
import type {
  DataDriftSpec,
  FileDataVisualizerSpec,
  IndexDataVisualizerSpec,
} from '../application';

let loadModulesPromise: Promise<LazyLoadedModules>;

interface LazyLoadedModules {
  FileDataVisualizer: FileDataVisualizerSpec;
  IndexDataVisualizer: IndexDataVisualizerSpec;
  DataDrift: DataDriftSpec;
  resultsLinks: ResultLinks;
}

export async function lazyLoadModules(resultsLinks: ResultLinks): Promise<LazyLoadedModules> {
  if (typeof loadModulesPromise !== 'undefined') {
    return loadModulesPromise;
  }

  loadModulesPromise = new Promise(async (resolve, reject) => {
    try {
      const lazyImports = await import('./lazy');
      resolve({ ...lazyImports, resultsLinks });
    } catch (error) {
      reject(error);
    }
  });
  return loadModulesPromise;
}
