/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  describe('dashboards - list', () => {
    const createManyDashboards = async (count: number) => {
      const fileChunks: string[] = [];
      for (let i = 0; i < count; i++) {
        const id = `test-dashboard-${i}`;
        fileChunks.push(
          JSON.stringify({
            type: 'dashboard',
            id,
            attributes: {
              title: `My dashboard (${i})`,
              kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
            },
            references: [],
          })
        );
      }

      await supertest
        .post(`/api/saved_objects/_import`)
        .attach('file', Buffer.from(fileChunks.join('\n'), 'utf8'), 'export.ndjson')
        .expect(200);
    };
    before(async () => {
      await createManyDashboards(100);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });
    loadTestFile(require.resolve('./main'));
  });
}
