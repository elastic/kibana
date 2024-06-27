/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['timePicker']);
  const from = '2024-06-10T14:00:00.000Z';
  const to = '2024-06-10T16:30:00.000Z';

  describe('discover/context_awareness', () => {
    before(async () => {
      await esArchiver.load('test/functional/fixtures/es_archiver/discover/context_awareness');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/discover/context_awareness'
      );
      await kibanaServer.uiSettings.update({
        'timepicker:timeDefaults': `{ "from": "${from}", "to": "${to}"}`,
      });
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/discover/context_awareness');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/discover/context_awareness'
      );
      await PageObjects.timePicker.resetDefaultAbsoluteRangeViaUiSettings();
    });

    loadTestFile(require.resolve('./_root_profile'));
    loadTestFile(require.resolve('./_data_source_profile'));
  });
}
