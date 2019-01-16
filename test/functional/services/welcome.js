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

export async function WelcomeProvider({ getService, getPageObjects }) {
  const browser = getService('browser');
  const lifecycle = getService('lifecycle');
  const PageObjects = getPageObjects(['common']);

  const welcome = new class Welcome {
    async disable() {
      await browser.setLocalStorageItem('home:welcome:show', 'false');
    }
  };

  lifecycle.on('beforeTests', async () => {
    await PageObjects.common.navigateToApp('home');
    await welcome.disable();
    await PageObjects.common.navigateToApp('home');
  });

  return welcome;
}
