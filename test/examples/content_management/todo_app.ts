/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { Key } from 'selenium-webdriver';

import { PluginFunctionalProviderContext } from '../../plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const PageObjects = getPageObjects(['common']);

  describe('Todo app', () => {
    it('Todo app works', async () => {
      const appId = 'contentManagementExamples';
      await PageObjects.common.navigateToApp(appId);
      await testSubjects.missingOrFail(`todoPending`);

      // check that initial state is correct
      let todos = await testSubjects.findAll(`~todoItem`);
      expect(todos.length).to.be(2);

      // check that filters work
      await (await find.byButtonText('Completed')).click();
      await testSubjects.missingOrFail(`todoPending`);
      todos = await testSubjects.findAll(`~todoItem`);
      expect(todos.length).to.be(1);

      await (await find.byButtonText('Todo')).click();
      await testSubjects.missingOrFail(`todoPending`);
      todos = await testSubjects.findAll(`~todoItem`);
      expect(todos.length).to.be(1);

      await (await find.byButtonText('All')).click();
      await testSubjects.missingOrFail(`todoPending`);
      todos = await testSubjects.findAll(`~todoItem`);
      expect(todos.length).to.be(2);

      // check that adding new todo works
      await testSubjects.setValue('newTodo', 'New todo');
      await (await testSubjects.find('newTodo')).pressKeys(Key.ENTER);
      await testSubjects.missingOrFail(`todoPending`);
      todos = await testSubjects.findAll(`~todoItem`);
      expect(todos.length).to.be(3);

      // check that updating todo works
      let newTodo = todos[2];
      expect(await newTodo.getVisibleText()).to.be('New todo');
      let newTodoCheckbox = await newTodo.findByTestSubject('~todoCheckbox');
      expect(await newTodoCheckbox.isSelected()).to.be(false);
      await (await newTodo.findByTagName('label')).click();
      await newTodo.click();
      await testSubjects.missingOrFail(`todoPending`);

      await (await find.byButtonText('Completed')).click();
      await testSubjects.missingOrFail(`todoPending`);
      todos = await testSubjects.findAll(`~todoItem`);
      expect(todos.length).to.be(2);
      newTodo = todos[1];
      expect(await newTodo.getVisibleText()).to.be('New todo');
      newTodoCheckbox = await newTodo.findByTestSubject('~todoCheckbox');
      expect(await newTodoCheckbox.isSelected()).to.be(true);

      // check that deleting todo works
      await (await newTodo.findByCssSelector('[aria-label="Delete"]')).click();
      await testSubjects.missingOrFail(`todoPending`);
      todos = await testSubjects.findAll(`~todoItem`);
      expect(todos.length).to.be(1);
    });
  });
}
