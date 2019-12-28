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
import { WebElementWrapper } from '../services/lib/web_element_wrapper';

export function TagCloudPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const { header, visChart } = getPageObjects(['header', 'visChart']);

  class TagCloudPage {
    async selectTagCloudTag(tagDisplayText: string) {
      await testSubjects.click(tagDisplayText);
      await header.waitUntilLoadingHasFinished();
    }

    async getTextTag() {
      await visChart.waitForVisualization();
      const elements = await find.allByCssSelector('text');
      return await Promise.all(elements.map(async element => await element.getVisibleText()));
    }

    async getTextSizes() {
      const tags = await find.allByCssSelector('text');
      async function returnTagSize(tag: WebElementWrapper) {
        const style = await tag.getAttribute('style');
        const fontSize = style.match(/font-size: ([^;]*);/);
        return fontSize ? fontSize[1] : '';
      }
      return await Promise.all(tags.map(returnTagSize));
    }
  }

  return new TagCloudPage();
}
