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

  describe('list container', () => {
    before(async () => {
      await testSubjects.click('listContainerSection');
    });

    it('list containers render', async () => {
      await retry.try(async () => {
        const title = await testSubjects.getVisibleText('listContainerTitle');
        expect(title).to.be('My todo list');

        const titles = await testSubjects.getVisibleTextAll('todoEmbeddableTitle');
        expect(titles).to.eql(['Take out the trash', 'Vaccum the floor', 'Take out the trash']);

        const searchableTitle = await testSubjects.getVisibleText('searchableListContainerTitle');
        expect(searchableTitle).to.be('My searchable todo list');

        const text = await testSubjects.getVisibleTextAll('helloWorldEmbeddable');
        expect(text).to.eql(['HELLO WORLD!', 'HELLO WORLD!']);

        const tasks = await testSubjects.getVisibleTextAll('multiTaskTodoTask');
        expect(tasks).to.eql(['Go to school', 'Watch planet earth', 'Read the encyclopedia']);
      });
    });

    it('searchable container deletes children', async () => {
      await testSubjects.click('todoCheckBox-1');
      await testSubjects.click('deleteCheckedTodos');

      const text = await testSubjects.getVisibleTextAll('helloWorldEmbeddable');
      expect(text).to.eql(['HELLO WORLD!']);
    });

    it('searchable container finds matches in multi-task children', async () => {
      await testSubjects.setValue('filterTodos', 'earth');
      await testSubjects.click('checkMatchingTodos');
      await testSubjects.click('deleteCheckedTodos');

      await testSubjects.missingOrFail('multiTaskTodoTask');
    });
  });
}
