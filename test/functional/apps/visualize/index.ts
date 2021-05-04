/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context.d';
import grps from './groups';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const deployment = getService('deployment');
  let isOss = true;

  describe('visualize app', () => {
    before(async () => {
      log.debug('Starting visualize before method');
      await browser.setWindowSize(1280, 800);
      await esArchiver.load('empty_kibana');

      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('long_window_logstash');

      isOss = await deployment.isOss();
    });

    // TODO: Remove when vislib is removed
    describe('new charts library visualize ciGroup7', function () {
      this.tags('ciGroup7');

      before(async () => await update(false));
      after(async () => await update(true));

      grps().get('7').forEach(load);
    });

    describe('visualize ciGroup9', function () {
      this.tags('ciGroup9');

      grps().get('9').forEach(load);

      // this check is not needed when the CI doesn't run anymore for the OSS
      if (!isOss) load('./_chart_types');
    });

    describe('visualize ciGroup10', function () {
      this.tags('ciGroup10');

      grps().get('10').forEach(load);
    });

    describe('visualize ciGroup4', function () {
      this.tags('ciGroup4');

      grps().get('4').forEach(load);

      if (isOss) ['./_tile_map', './_region_map'].forEach(load);
    });

    describe('visualize ciGroup12', function () {
      this.tags('ciGroup12');

      grps().get('12').forEach(load);
    });
  });

  async function update(x: boolean) {
    await kibanaServer.uiSettings.update({
      'visualization:visualize:legacyChartsLibrary': x,
    });
    await browser.refresh();
  }

  function load(x: string) {
    loadTestFile(require.resolve(x));
  }
}
