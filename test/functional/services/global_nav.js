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

export function GlobalNavProvider({ getService }) {
  const testSubjects = getService('testSubjects');

  return new class GlobalNav {
    async moveMouseToLogo() {
      await testSubjects.moveMouseTo('headerGlobalNav logo');
    }

    async clickLogo() {
      return await testSubjects.click('headerGlobalNav logo');
    }

    async exists() {
      return await testSubjects.exists('headerGlobalNav');
    }

    async getFirstBreadcrumb() {
      return await testSubjects.getVisibleText('headerGlobalNav breadcrumbs first&breadcrumb');
    }

    async getLastBreadcrumb() {
      return await testSubjects.getVisibleText('headerGlobalNav breadcrumbs last&breadcrumb');
    }

    async badgeExistsOrFail(expectedLabel) {
      await testSubjects.existOrFail('headerBadge');
      const element = await testSubjects.find('headerBadge');
      const actualLabel = await element.getAttribute('data-test-badge-label');
      expect(actualLabel.toUpperCase()).to.equal(expectedLabel.toUpperCase());
    }

    async badgeMissingOrFail() {
      await testSubjects.missingOrFail('headerBadge');
    }
  };
}
