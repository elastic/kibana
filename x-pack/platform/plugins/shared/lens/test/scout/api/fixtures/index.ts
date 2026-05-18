/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { apiTest as baseApiTest } from '@kbn/scout';

import { LENS_EXAMPLE_DOCS_ARCHIVE, SAMPLE_DATA_VIEW_ID } from './constants';

/**
 * Lens-specific setup helpers backed by `kbnClient`. Both methods run with
 * admin credentials, so they are intended for `beforeAll` setup, not for
 * endpoint validation.
 */
export interface LensHelper {
  /**
   * Creates the `logstash-*` index-pattern (`SAMPLE_DATA_VIEW_ID`) referenced
   * by every Lens saved object in `lens_example_docs.json`. Replaces the
   * FTR-era `kbn_archiver/saved_objects/basic.json` load (the other saved
   * objects in that archive were unused by these tests).
   */
  createSampleDataView: () => Promise<void>;
  /**
   * Creates the supporting `logstash-*` index-pattern and loads the four
   * fixture Lens visualizations from `LENS_EXAMPLE_DOCS_ARCHIVE`.
   */
  loadLensExampleDocs: () => Promise<void>;
}

interface LensApiWorkerFixtures extends ScoutWorkerFixtures {
  lensHelper: LensHelper;
}

export const apiTest = baseApiTest.extend<ScoutTestFixtures, LensApiWorkerFixtures>({
  lensHelper: [
    async ({ kbnClient }, use) => {
      const createSampleDataView: LensHelper['createSampleDataView'] = async () => {
        await kbnClient.savedObjects.create({
          type: 'index-pattern',
          id: SAMPLE_DATA_VIEW_ID,
          overwrite: true,
          attributes: {
            title: 'logstash-*',
            timeFieldName: '@timestamp',
          },
        });
      };

      const loadLensExampleDocs: LensHelper['loadLensExampleDocs'] = async () => {
        await createSampleDataView();
        await kbnClient.importExport.load(LENS_EXAMPLE_DOCS_ARCHIVE);
      };

      await use({ createSampleDataView, loadLensExampleDocs });
    },
    { scope: 'worker' },
  ],
});

export {
  COMMON_HEADERS,
  INVALID_LENS_ID,
  KNOWN_LENS_ID,
  LENS_API_PATH,
  LENS_API_VERSION,
  LENS_EXAMPLE_DOCS_ARCHIVE,
  SAMPLE_DATA_VIEW_ID,
  getExampleLensBody,
} from './constants';
