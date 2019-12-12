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

import { FtrProviderContext } from '../ftr_provider_context';

export default function({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);
  const a11y = getService('a11y');


  describe('Visualize', () => {

    before(async () => {

      await PageObjects.common.navigateToApp('visualize');
    });

    it('visualize', async () => {
      await a11y.testAppSnapshot();
    });

    it('click on create visualize wizard', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await a11y.testAppSnapshot();
    });

    
    it.skip('create visualize button', async () => {
     await PageObjects.visualize.clickNewVisualization();
     await a11y.testAppSnapshot();
    });
  });
}
