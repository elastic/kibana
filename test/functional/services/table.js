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

export function TableProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  // const retry = getService('retry');

  class Table {

    async getDataFromTestSubj(testSubj) {
      const table = await testSubjects.find(testSubj);
      return await this.getDataFromElement(table);
    }

    async getDataFromElement(table) {
      // Convert the data into a nested array format:
      // [ [cell1_in_row1, cell2_in_row1], [cell1_in_row2, cell2_in_row2] ]
      const rows = await table.findAllByTagName('tr');
      return await Promise.all(rows.map(async row => {
        const cells = await row.findAllByTagName('td');
        return await Promise.all(cells.map(async cell => await cell.getVisibleText()));
      }));
    }
  }

  return new Table();
}
