/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResultLinks } from '@kbn/file-upload-common';
// import type { FileDataVisualizerSpec } from '@kbn/file-upload/src/file_upload_component/file_data_visualizer';
import type { DataDriftSpec, IndexDataVisualizerSpec } from '../application';

let loadModulesPromise: Promise<LazyLoadedModules>;

interface LazyLoadedModules {
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
