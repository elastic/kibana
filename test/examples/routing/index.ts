/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects, loadTestFile }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  describe('routing examples', function () {
    before(async () => {
      this.tags('ciGroup2');
      await PageObjects.common.navigateToApp('routingExample');
    });

    it('basic get example', async () => {
      await retry.try(async () => {
        await testSubjects.click('routingExampleFetchRandomNumber');
        const numberAsString = await testSubjects.getVisibleText('routingExampleRandomNumber');
        expect(numberAsString).to.not.be(undefined);
        const number = parseFloat(numberAsString);
        expect(number).to.be.lessThan(10);
        expect(number).to.be.greaterThan(0);
      });
    });

    it('basic get example with query param', async () => {
      await retry.try(async () => {
        await testSubjects.setValue('routingExampleMaxRandomNumberBetween', '3');
        await testSubjects.click('routingExampleFetchRandomNumberBetween');
        const numberAsString = await testSubjects.getVisibleText(
          'routingExampleRandomNumberBetween'
        );
        expect(numberAsString).to.not.be(undefined);
        const number = parseFloat(numberAsString);
        expect(number).to.be.lessThan(3);
        expect(number).to.be.greaterThan(0);
      });
    });

    it('post and get message example', async () => {
      await testSubjects.setValue('routingExampleSetMessageId', '234');
      await testSubjects.setValue('routingExampleSetMessage', 'hello!');
      await testSubjects.click('routingExamplePostMessage');
      await testSubjects.setValue('routingExampleGetMessageId', '234');
      await testSubjects.click('routingExampleFetchMessage');

      await retry.try(async () => {
        const message = await testSubjects.getVisibleText('routingExampleGetMessage');
        expect(message).to.be('hello!');
      });
    });
  });
}
