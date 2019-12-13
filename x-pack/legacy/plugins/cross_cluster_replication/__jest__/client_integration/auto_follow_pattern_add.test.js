/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setupEnvironment, pageHelpers, nextTick, getRandomString } from './helpers';
import { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } from '../../../../../../src/legacy/ui/public/index_patterns';

jest.mock('ui/new_platform');

const { setup } = pageHelpers.autoFollowPatternAdd;

describe('Create Auto-follow pattern', () => {
  let server;
  let httpRequestsMockHelpers;

  beforeAll(() => {
    ({ server, httpRequestsMockHelpers } = setupEnvironment());
  });

  afterAll(() => {
    server.restore();
  });

  beforeEach(() => {
    httpRequestsMockHelpers.setLoadRemoteClustersResponse([]);
  });

  describe('on component mount', () => {
    let find;
    let exists;

    beforeEach(() => {
      ({ find, exists } = setup());
    });

    test('should display a "loading remote clusters" indicator', () => {
      expect(exists('remoteClustersLoading')).toBe(true);
      expect(find('remoteClustersLoading').text()).toBe('Loading remote clusters…');
    });

    test('should have a link to the documentation', () => {
      expect(exists('docsButton')).toBe(true);
    });
  });

  describe('when remote clusters are loaded', () => {
    let find;
    let exists;
    let component;
    let actions;
    let form;

    beforeEach(async () => {
      ({ find, exists, component, actions, form } = setup());

      await nextTick(); // We need to wait next tick for the mock server response to comes in
      component.update();
    });

    test('should display the Auto-follow pattern form', async () => {
      expect(exists('autoFollowPatternForm')).toBe(true);
    });

    test('should display errors and disable the save button when clicking "save" without filling the form', () => {
      expect(exists('formError')).toBe(false);
      expect(find('submitButton').props().disabled).toBe(false);

      actions.clickSaveForm();

      expect(exists('formError')).toBe(true);
      expect(form.getErrorsMessages()).toEqual([
        'Name is required.',
        'At least one leader index pattern is required.',
      ]);
      expect(find('submitButton').props().disabled).toBe(true);
    });
  });

  describe('form validation', () => {
    let find;
    let exists;
    let component;
    let actions;
    let form;

    describe('auto-follow pattern name', () => {
      beforeEach(async () => {
        ({ component, form, actions } = setup());

        await nextTick();
        component.update();
      });

      test('should not allow spaces', () => {
        form.setInputValue('nameInput', 'with space');
        actions.clickSaveForm();
        expect(form.getErrorsMessages()).toContain('Spaces are not allowed in the name.');
      });

      test('should not allow a "_" (underscore) as first character', () => {
        form.setInputValue('nameInput', '_withUnderscore');
        actions.clickSaveForm();
        expect(form.getErrorsMessages()).toContain(`Name can't begin with an underscore.`);
      });

      test('should not allow a "," (comma)', () => {
        form.setInputValue('nameInput', 'with,coma');
        actions.clickSaveForm();
        expect(form.getErrorsMessages()).toContain(`Commas are not allowed in the name.`);
      });
    });

    describe('remote clusters', () => {
      describe('when no remote clusters were found', () => {
        test('should indicate it and have a button to add one', async () => {
          ({ exists, component } = setup());

          await nextTick();
          component.update();

          expect(exists('noClusterFoundError')).toBe(true);
          expect(exists('remoteClusterFormField.addButton')).toBe(true);
        });
      });

      describe('when there was an error loading the remote clusters', () => {
        test('should indicate no clusters found and have a button to add one', async () => {
          httpRequestsMockHelpers.setLoadRemoteClustersResponse(undefined, { body: 'Houston we got a problem' });

          ({ component } = setup());
          await nextTick();
          component.update();

          expect(exists('noClusterFoundError')).toBe(true);
          expect(exists('remoteClusterFormField.addButton')).toBe(true);
        });
      });

      describe('when none of the remote clusters is connected', () => {
        const clusterName = 'new-york';
        const remoteClusters = [{
          name: clusterName,
          seeds: ['localhost:9600'],
          isConnected: false,
        }];

        beforeEach(async () => {
          httpRequestsMockHelpers.setLoadRemoteClustersResponse(remoteClusters);

          ({ find, exists, component } = setup());
          await nextTick();
          component.update();
        });

        test('should show a callout warning and have a button to edit the cluster', () => {
          const errorCallOut = find('notConnectedError');

          expect(errorCallOut.length).toBe(1);
          expect(errorCallOut.find('.euiCallOutHeader__title').text()).toBe(`Remote cluster '${clusterName}' is not connected`);
          expect(exists('notConnectedError.editButton')).toBe(true);
        });

        test('should have a button to add another remote cluster', () => {
          expect(exists('remoteClusterFormField.addButton')).toBe(true);
        });

        test('should indicate in the select option that the cluster is not connected', () => {
          const selectOptions = find('remoteClusterSelect').find('option');
          expect(selectOptions.at(0).text()).toBe(`${clusterName} (not connected)`);
        });
      });
    });

    describe('index patterns', () => {
      beforeEach(async () => {
        ({ component, form } = setup());

        await nextTick();
        component.update();
      });

      test('should not allow spaces', () => {
        expect(form.getErrorsMessages()).toEqual([]);

        form.setComboBoxValue('indexPatternInput', 'with space');

        expect(form.getErrorsMessages()).toContain('Spaces are not allowed in the index pattern.');
      });

      test('should not allow invalid characters', () => {
        const expectInvalidChar = (char) => {
          form.setComboBoxValue('indexPatternInput', `with${char}space`);
          expect(form.getErrorsMessages()).toContain(`Remove the character ${char} from the index pattern.`);
        };

        return INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE.reduce((promise, char) => {
          return promise.then(() => expectInvalidChar(char));
        }, Promise.resolve());
      });
    });
  });

  describe('generated indices preview', () => {
    let find;
    let exists;
    let component;
    let form;

    beforeEach(async () => {
      ({ exists, find, component, form } = setup());

      await nextTick();
      component.update();
    });

    test('should display a preview of the possible indices generated by the auto-follow pattern', () => {
      expect(exists('autoFollowPatternIndicesPreview')).toBe(false);

      form.setComboBoxValue('indexPatternInput', 'kibana-');

      expect(exists('autoFollowPatternIndicesPreview')).toBe(true);
    });

    test('should display 3 indices example when providing a wildcard(*)', () => {
      form.setComboBoxValue('indexPatternInput', 'kibana-*');
      const indicesPreview = find('indexPreview');

      expect(indicesPreview.length).toBe(3);
      expect(indicesPreview.at(0).text()).toContain('kibana-');
    });

    test('should only display 1 index example when *not* providing a wildcard', () => {
      form.setComboBoxValue('indexPatternInput', 'kibana');
      const indicesPreview = find('indexPreview');

      expect(indicesPreview.length).toBe(1);
      expect(indicesPreview.at(0).text()).toEqual('kibana');
    });

    test('should add the prefix and the suffix to the preview', () => {
      const prefix = getRandomString();
      const suffix = getRandomString();

      form.setComboBoxValue('indexPatternInput', 'kibana');
      form.setInputValue('prefixInput', prefix);
      form.setInputValue('suffixInput', suffix);

      const indicesPreview = find('indexPreview');
      const textPreview = indicesPreview.at(0).text();

      expect(textPreview).toContain(prefix);
      expect(textPreview).toContain(suffix);
    });
  });
});
