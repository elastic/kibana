/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';
import * as fixtures from '../../test/fixtures';
import { setupEnvironment, pageHelpers, nextTick, getRandomString } from './helpers';
import { IdxMgmtHomeTestBed } from './helpers/home.helpers';

const API_PATH = '/api/index_management';

const { setup } = pageHelpers.home;

const removeWhiteSpaceOnArrayValues = (array: any[]) =>
  array.map(value => {
    if (!value.trim) {
      return value;
    }
    return value.trim();
  });

// We need to skip the tests until react 16.9.0 is released
// which supports asynchronous code inside act()
describe.skip('<IndexManagementHome />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: IdxMgmtHomeTestBed;

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', async () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([]);

      testBed = await setup();

      // @ts-ignore (remove when react 16.9.0 is released)
      await act(async () => {
        const { component } = testBed;

        await nextTick();
        component.update();
      });
    });

    test('should set the correct app title', () => {
      const { exists, find } = testBed;
      expect(exists('appTitle')).toBe(true);
      expect(find('appTitle').text()).toEqual('Index Management');
    });

    test('should have a link to the documentation', () => {
      const { exists, find } = testBed;
      expect(exists('documentationLink')).toBe(true);
      expect(find('documentationLink').text()).toBe('Index Management docs');
    });

    describe('tabs', () => {
      test('should have 2 tabs', () => {
        const { find } = testBed;

        expect(find('tab').length).toBe(2);
        expect(find('tab').map(t => t.text())).toEqual(['Indices', 'Index Templates']);
      });

      test('should navigate to Index Templates tab', async () => {
        const { exists, actions, component } = testBed;

        expect(exists('indicesList')).toBe(true);
        expect(exists('templatesList')).toBe(false);

        httpRequestsMockHelpers.setLoadTemplatesResponse([]);

        actions.selectTab('index templates');

        // @ts-ignore (remove when react 16.9.0 is released)
        await act(async () => {
          await nextTick();
          component.update();
        });

        expect(exists('indicesList')).toBe(false);
        expect(exists('templatesList')).toBe(true);
      });
    });

    describe('index templates', () => {
      describe('when there are no index templates', () => {
        beforeEach(async () => {
          const { actions, component } = testBed;

          httpRequestsMockHelpers.setLoadTemplatesResponse([]);

          actions.selectTab('index templates');

          // @ts-ignore (remove when react 16.9.0 is released)
          await act(async () => {
            await nextTick();
            component.update();
          });
        });

        test('should display an empty prompt', async () => {
          const { exists } = testBed;

          expect(exists('sectionLoading')).toBe(false);
          expect(exists('emptyPrompt')).toBe(true);
        });
      });

      describe('when there are index templates', () => {
        const template1 = fixtures.getTemplate({
          name: `a${getRandomString()}`,
          indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
          settings: {
            index: {
              number_of_shards: '1',
            },
          },
        });
        const template2 = fixtures.getTemplate({
          name: `b${getRandomString()}`,
          indexPatterns: ['template2Pattern1*'],
        });
        const template3 = fixtures.getTemplate({
          name: `c${getRandomString()}`,
          indexPatterns: ['template3Pattern1*', 'template3Pattern2', 'template3Pattern3'],
        });

        const templates = [template1, template2, template3];

        beforeEach(async () => {
          const { actions, component } = testBed;

          httpRequestsMockHelpers.setLoadTemplatesResponse(templates);

          actions.selectTab('index templates');

          // @ts-ignore (remove when react 16.9.0 is released)
          await act(async () => {
            await nextTick();
            component.update();
          });
        });

        test('should list them in the table', async () => {
          const { table } = testBed;

          const { tableCellsValues } = table.getMetaData('templatesTable');

          tableCellsValues.forEach((row, i) => {
            const template = templates[i];
            const { name, indexPatterns, order, version } = template;

            expect(removeWhiteSpaceOnArrayValues(row)).toEqual([
              name,
              indexPatterns.join(', '),
              order.toString(),
              version.toString(),
              '',
              '',
              '',
            ]);
          });
        });

        test('should have a button to reload the index templates', async () => {
          const { component, exists, actions } = testBed;
          const totalRequests = server.requests.length;

          expect(exists('reloadButton')).toBe(true);

          // @ts-ignore (remove when react 16.9.0 is released)
          await act(async () => {
            actions.clickReloadButton();
            await nextTick();
            component.update();
          });

          expect(server.requests.length).toBe(totalRequests + 1);
          expect(server.requests[server.requests.length - 1].url).toBe(`${API_PATH}/templates`);
        });
      });
    });
  });
});
