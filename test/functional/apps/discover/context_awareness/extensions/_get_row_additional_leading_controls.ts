/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import kbnRison from '@kbn/rison';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover']);
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');

  describe.only('extension getRowAdditionalLeadingControls', () => {
    describe('ES|QL mode', () => {
      it('should render logs controls for logs data source', async () => {
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: { esql: 'from logs-*-* | sort @timestamp desc' },
        });
        await PageObjects.common.navigateToApp('discover', {
          hash: `/?_a=${state}`,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await testSubjects.existOrFail('docTableDegradedDocExist');
        await testSubjects.existOrFail('docTableStacktraceExist');
      });

      it('should not render logs controls for non-logs data source', async () => {
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: { esql: 'from metrics-* | sort @timestamp desc' },
        });
        await PageObjects.common.navigateToApp('discover', {
          hash: `/?_a=${state}`,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await testSubjects.missingOrFail('docTableDegradedDocExist');
        await testSubjects.missingOrFail('docTableStacktraceExist');
      });
    });

    describe('data view mode', () => {
      it('should render logs controls for logs data source', async () => {
        await PageObjects.common.navigateToApp('discover');
        await dataViews.switchTo('logs-*-*');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await testSubjects.existOrFail('docTableDegradedDocExist');
        await testSubjects.existOrFail('docTableStacktraceExist');
      });

      it('should not render logs controls for non-logs data source', async () => {
        await PageObjects.common.navigateToApp('discover');
        await dataViews.switchTo('metrics-*');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await testSubjects.missingOrFail('docTableDegradedDocExist');
        await testSubjects.missingOrFail('docTableStacktraceExist');
      });
    });
  });
}
