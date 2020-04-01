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

export default function({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  describe('management plugin', function describeIndexTests() {
    before(async () => {
      await PageObjects.common.navigateToActualUrl('kibana', 'management');
    });

    it('should be able to navigate to management test app', async () => {
      await testSubjects.click('test-management');
      await testSubjects.existOrFail('test-management-header');
    });

    it('should be able to navigate within management test app', async () => {
      await testSubjects.click('test-management-link-one');
      await testSubjects.click('test-management-link-basepath');
      await testSubjects.existOrFail('test-management-link-one');
    });

    it('should redirect when app is disabled', async () => {
      await PageObjects.common.navigateToActualUrl(
        'kibana',
        'management/test-section/test-management-disabled'
      );
      await testSubjects.existOrFail('management-landing');
    });
  });
}
