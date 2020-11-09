/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from 'test/functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects, loadTestFile }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  describe('routing examples', function () {
    before(async () => {
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
