/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import kbnRison from '@kbn/rison';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover']);
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');

  describe('root profile', () => {
    describe('ES|QL mode', () => {
      describe('cell renderers', () => {
        it('should render custom @timestamp', async () => {
          const state = kbnRison.encode({
            dataSource: { type: 'esql' },
            query: { esql: 'from my-example-* | sort @timestamp desc' },
          });
          await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
            ensureCurrentUrl: false,
          });
          await PageObjects.discover.waitUntilSearchingHasFinished();
          const timestamps = await testSubjects.findAll('exampleRootProfileTimestamp');
          expect(timestamps).to.have.length(6);
          expect(await timestamps[0].getVisibleText()).to.be('2024-06-10T16:30:00.000Z');
          expect(await timestamps[5].getVisibleText()).to.be('2024-06-10T14:00:00.000Z');
        });
      });
    });

    describe('data view mode', () => {
      describe('cell renderers', () => {
        it('should render custom @timestamp', async () => {
          await PageObjects.common.navigateToActualUrl('discover', undefined, {
            ensureCurrentUrl: false,
          });
          await dataViews.switchTo('my-example-*');
          await PageObjects.discover.waitUntilSearchingHasFinished();
          const timestamps = await testSubjects.findAll('exampleRootProfileTimestamp');
          expect(timestamps).to.have.length(6);
          expect(await timestamps[0].getVisibleText()).to.be('2024-06-10T16:30:00.000Z');
          expect(await timestamps[5].getVisibleText()).to.be('2024-06-10T14:00:00.000Z');
        });
      });
    });
  });
}
