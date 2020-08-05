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
import { PluginFunctionalProviderContext } from 'test/plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: PluginFunctionalProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('todo embeddable', () => {
    before(async () => {
      await testSubjects.click('todoEmbeddableSection');
    });

    it('todo embeddable renders', async () => {
      await retry.try(async () => {
        const title = await testSubjects.getVisibleText('todoEmbeddableTitle');
        expect(title).to.be('Trash');
        const task = await testSubjects.getVisibleText('todoEmbeddableTask');
        expect(task).to.be('Take out the trash');
      });
    });

    it('todo embeddable updates', async () => {
      await testSubjects.setValue('taskTodo', 'read a book');
      await testSubjects.setValue('titleTodo', 'Learn');
      await testSubjects.click('updateTodoButton');

      await retry.try(async () => {
        const title = await testSubjects.getVisibleText('todoEmbeddableTitle');
        expect(title).to.be('Learn');
        const task = await testSubjects.getVisibleText('todoEmbeddableTask');
        expect(task).to.be('read a book');
      });
    });
  });
}
