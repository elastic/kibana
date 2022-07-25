/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../plugin_functional/services';

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
