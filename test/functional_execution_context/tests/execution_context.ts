/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import expect from '@kbn/expect';
import Fs from 'fs/promises';
import Path from 'path';
import type { FtrProviderContext } from '../ftr_provider_context';

const logFilePath = Path.resolve(__dirname, '../kibana.log');

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'home', 'timePicker']);
  const retry = getService('retry');

  describe('Execution context service', () => {
    describe('Sends execution context to elasticsearch via "x-opaque-id" header', () => {
      before(async () => {
        await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
          useActualUrl: true,
        });
        await PageObjects.home.addSampleDataSet('flights');
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      after(async () => {
        await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
          useActualUrl: true,
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.removeSampleDataSet('flights');
      });

      describe('discover app', () => {
        before(async () => {
          await PageObjects.common.navigateToApp('discover');
          await PageObjects.header.waitUntilLoadingHasFinished();
        });

        it('propagates context for Discover', async () => {
          await retry.waitFor('log contains a record with x-opaque-id', async () => {
            const logs = await Fs.readFile(logFilePath, 'utf-8');
            return logs.includes('kibana:application:discover');
          });
        });
      });

      describe('dashboard app', () => {
        let logs: string;

        before(async () => {
          await PageObjects.common.navigateToApp('dashboard');
          await PageObjects.dashboard.loadSavedDashboard('[Flights] Global Flight Dashboard');
          await PageObjects.dashboard.waitForRenderComplete();
          await PageObjects.header.waitUntilLoadingHasFinished();
          logs = await Fs.readFile(logFilePath, 'utf-8');
        });
        it('propagates context for Lens visualizations', async () => {
          expect(logs).to.contain(
            'kibana:application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;lens:lnsXY:086ac2e9-dd16-4b45-92b8-1e43ff7e3f65'
          );

          expect(logs).to.contain(
            'kibana:application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;lens:lnsMetric:b766e3b8-4544-46ed-99e6-9ecc4847e2a2'
          );

          expect(logs).to.contain(
            'kibana:application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;lens:lnsDatatable:fb86b32f-fb7a-45cf-9511-f366fef51bbd'
          );

          expect(logs).to.contain(
            'kibana:application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;lens:lnsPie:5d53db36-2d5a-4adc-af7b-cec4c1a294e0'
          );
        });

        it('propagates context for built-in Discover', async () => {
          expect(logs).to.contain(
            'application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;search:discover:571aaf70-4c88-11e8-b3d7-01146121b73d'
          );
        });

        it('propagates context for TSVB visualizations', async () => {
          expect(logs).to.contain(
            'kibana:application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;visualization:TSVB:bcb63b50-4c89-11e8-b3d7-01146121b73d'
          );
        });

        it('propagates context for Vega visualizations', async () => {
          expect(logs).to.contain(
            'kibana:application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;visualization:Vega:ed78a660-53a0-11e8-acbd-0be0ad9d822b'
          );
        });

        it('propagates context for Tag Cloud visualization', async () => {
          expect(logs).to.contain(
            'kibana:application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;visualization:Tag cloud:293b5a30-4c8f-11e8-b3d7-01146121b73d'
          );
        });

        it('propagates context for Vertical bar visualization', async () => {
          expect(logs).to.contain(
            'kibana:application:dashboard:7adfa750-4c81-11e8-b3d7-01146121b73d;visualization:Vertical bar:9886b410-4c8b-11e8-b3d7-01146121b73d'
          );
        });
      });
    });
  });
}
