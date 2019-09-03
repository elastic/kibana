/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pageHelpers, nextTick, setupEnvironment } from './helpers';
import { NON_ALPHA_NUMERIC_CHARS, ACCENTED_CHARS } from './helpers/constants';

const { setup } = pageHelpers.remoteClustersAdd;

describe('Create Remote cluster', () => {
  describe('on component mount', () => {
    let find;
    let exists;
    let actions;
    let form;
    let server;

    beforeAll(() => {
      ({ server } = setupEnvironment());
    });

    afterAll(() => {
      server.restore();
    });

    beforeEach(() => {
      ({ form, exists, find, actions } = setup());
    });

    test('should have the title of the page set correctly', () => {
      expect(exists('remoteClusterPageTitle')).toBe(true);
      expect(find('remoteClusterPageTitle').text()).toEqual('Add remote cluster');
    });

    test('should have a link to the documentation', () => {
      expect(exists('remoteClusterDocsButton')).toBe(true);
    });

    test('should have a toggle to Skip unavailable remote cluster', () => {
      expect(exists('remoteClusterFormSkipUnavailableFormToggle')).toBe(true);

      // By default it should be set to "false"
      expect(find('remoteClusterFormSkipUnavailableFormToggle').props().checked).toBe(false);

      form.toggleEuiSwitch('remoteClusterFormSkipUnavailableFormToggle');

      expect(find('remoteClusterFormSkipUnavailableFormToggle').props().checked).toBe(true);
    });

    test('should display errors and disable the save button when clicking "save" without filling the form', () => {
      expect(exists('remoteClusterFormGlobalError')).toBe(false);
      expect(find('remoteClusterFormSaveButton').props().disabled).toBe(false);

      actions.clickSaveForm();

      expect(exists('remoteClusterFormGlobalError')).toBe(true);
      expect(form.getErrorsMessages()).toEqual([
        'Name is required.',
        'At least one seed node is required.',
      ]);
      expect(find('remoteClusterFormSaveButton').props().disabled).toBe(true);
    });
  });

  describe('form validation', () => {
    describe('remote cluster name', () => {
      let component;
      let actions;
      let form;

      beforeEach(async () => {
        ({ component, form, actions } = setup());

        await nextTick();
        component.update();
      });

      test('should not allow spaces', () => {
        form.setInputValue('remoteClusterFormNameInput', 'with space');
        actions.clickSaveForm();
        expect(form.getErrorsMessages()).toContain('Spaces are not allowed in the name.');
      });

      test('should only allow alpha-numeric characters, "-" (dash) and "_" (underscore)', () => {
        const expectInvalidChar = (char) => {
          if (char === '-' || char === '_') {
            return;
          }

          try {
            form.setInputValue('remoteClusterFormNameInput', `with${char}`);
            expect(form.getErrorsMessages()).toContain(`Remove the character ${char} from the name.`);
          } catch {
            throw Error(`Char "${char}" expected invalid but was allowed`);
          }
        };

        actions.clickSaveForm(); // display form errors

        [...NON_ALPHA_NUMERIC_CHARS, ...ACCENTED_CHARS].forEach(expectInvalidChar);
      });
    });

    describe('seeds', () => {
      let actions;
      let form;

      beforeEach(async () => {
        ({ form, actions } = setup());
      });

      test('should only allow alpha-numeric characters and "-" (dash) in the node "host" part', () => {
        actions.clickSaveForm(); // display form errors

        const notInArray = array => value => array.indexOf(value) < 0;

        const expectInvalidChar = (char) => {
          form.setComboBoxValue('remoteClusterFormSeedsInput', `192.16${char}:3000`);
          expect(form.getErrorsMessages()).toContain(`Seed node must use host:port format. Example: 127.0.0.1:9400, localhost:9400. Hosts can only consist of letters, numbers, and dashes.`); // eslint-disable-line max-len
        };

        [...NON_ALPHA_NUMERIC_CHARS, ...ACCENTED_CHARS]
          .filter(notInArray(['-', '_', ':']))
          .forEach(expectInvalidChar);
      });

      test('should require a numeric "port" to be set', () => {
        actions.clickSaveForm();

        form.setComboBoxValue('remoteClusterFormSeedsInput', '192.168.1.1');
        expect(form.getErrorsMessages()).toContain('A port is required.');

        form.setComboBoxValue('remoteClusterFormSeedsInput', '192.168.1.1:abc');
        expect(form.getErrorsMessages()).toContain('A port is required.');
      });
    });
  });
});
