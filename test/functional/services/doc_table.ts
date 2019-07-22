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
import { WebElementWrapper } from './lib/web_element_wrapper';

export function DocTableProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'header']);

  class DocTable {
    public async getTable() {
      return await testSubjects.find('docTable');
    }

    public async getRowsText(): Promise<string[]> {
      const table = await this.getTable();
      const $ = await table.parseDomContent();
      return $('[data-test-subj~="docTableRow"]')
        .toArray()
        .map((row: any) =>
          $(row)
            .text()
            .trim()
        );
    }

    public async getBodyRows(): Promise<WebElementWrapper[]> {
      const table = await this.getTable();
      return await table.findAllByCssSelector('[data-test-subj~="docTableRow"]');
    }

    public async getAnchorRow(): Promise<WebElementWrapper> {
      const table = await this.getTable();
      return await table.findByCssSelector('[data-test-subj~="docTableAnchorRow"]');
    }

    public async getAnchorDetailsRow(): Promise<WebElementWrapper> {
      const table = await this.getTable();
      return await table.findByCssSelector(
        '[data-test-subj~="docTableAnchorRow"] + [data-test-subj~="docTableDetailsRow"]'
      );
    }

    public async getRowExpandToggle(row: WebElementWrapper): Promise<WebElementWrapper> {
      return await row.findByCssSelector('[data-test-subj~="docTableExpandToggleColumn"]');
    }

    public async getDetailsRows(): Promise<WebElementWrapper[]> {
      const table = await this.getTable();
      return await table.findAllByCssSelector(
        '[data-test-subj~="docTableRow"] + [data-test-subj~="docTableDetailsRow"]'
      );
    }

    public async getRowActions(row: WebElementWrapper): Promise<WebElementWrapper[]> {
      return await row.findAllByCssSelector('[data-test-subj~="docTableRowAction"]');
    }

    public async getFields(row: WebElementWrapper): Promise<WebElementWrapper[]> {
      return await row.findAllByCssSelector('[data-test-subj~="docTableField"]');
    }

    public async getHeaderFields(): Promise<WebElementWrapper[]> {
      const table = await this.getTable();
      return await table.findAllByCssSelector('[data-test-subj~="docTableHeaderField"]');
    }

    public async getTableDocViewRow(
      detailsRow: WebElementWrapper,
      fieldName: WebElementWrapper
    ): Promise<WebElementWrapper> {
      return await detailsRow.findByCssSelector(`[data-test-subj~="tableDocViewRow-${fieldName}"]`);
    }

    public async getAddInclusiveFilterButton(
      tableDocViewRow: WebElementWrapper
    ): Promise<WebElementWrapper> {
      return await tableDocViewRow.findByCssSelector(
        `[data-test-subj~="addInclusiveFilterButton"]`
      );
    }

    async addInclusiveFilter(
      detailsRow: WebElementWrapper,
      fieldName: WebElementWrapper
    ): Promise<void> {
      const tableDocViewRow = await this.getTableDocViewRow(detailsRow, fieldName);
      const addInclusiveFilterButton = await this.getAddInclusiveFilterButton(tableDocViewRow);
      await addInclusiveFilterButton.click();
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    }

    public async toggleRowExpanded(row: WebElementWrapper): Promise<WebElementWrapper> {
      const rowExpandToggle = await this.getRowExpandToggle(row);
      await rowExpandToggle.click();
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();

      const detailsRow = await row.findByXpath(
        './following-sibling::*[@data-test-subj="docTableDetailsRow"]'
      );
      return await retry.try(async () => {
        return detailsRow.findByCssSelector('[data-test-subj~="docViewer"]');
      });
    }
  }

  return new DocTable();
}
