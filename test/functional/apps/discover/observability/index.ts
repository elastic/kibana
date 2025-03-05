/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const { common, spaceSettings } = getPageObjects(['common', 'spaceSettings']);

  const from = 'Sep 22, 2015 @ 00:00:00.000';
  const to = 'Sep 23, 2015 @ 00:00:00.000';

  describe('discover/observability', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await common.setTime({
        from,
        to,
      });
      await spaceSettings.switchSpaceSolutionType({
        spaceName: 'default',
        solution: 'oblt',
      });
    });

    after(async () => {
      await spaceSettings.switchSpaceSolutionType({
        spaceName: 'default',
        solution: 'classic',
      });
      await common.unsetTime();
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    loadTestFile(require.resolve('./embeddable/saved_search_embeddable'));
  });
}
