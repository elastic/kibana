/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Mocking EuiSearchBar because its onChange is not firing during tests
 */
import React from 'react';
import { EuiSearchBoxProps } from '@elastic/eui/src/components/search_bar/search_box';
import { applicationServiceMock } from '@kbn/core/public/mocks';
import { act } from 'react-dom/test-utils';

import { API_BASE_PATH, Index, INTERNAL_API_BASE_PATH } from '../../../common';
import { setupEnvironment } from '../helpers';
import { IndicesTestBed, setup } from './indices_tab.helpers';
import {
  createDataStreamBackingIndex,
  createDataStreamPayload,
  createNonDataStreamIndex,
} from './data_streams_tab.helpers';

import { createMemoryHistory } from 'history';
import {
  breadcrumbService,
  IndexManagementBreadcrumb,
} from '../../../public/application/services/breadcrumbs';

jest.mock('@elastic/eui/lib/components/search_bar/search_box', () => {
  return {
    EuiSearchBox: (props: EuiSearchBoxProps) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockSearchBox'}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          props.onSearch(event.target.value);
        }}
      />
    ),
  };
});
jest.mock('react-use/lib/useObservable', () => () => jest.fn());

describe('<IndexManagementHome />', () => {
  let testBed: IndicesTestBed;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  jest.spyOn(breadcrumbService, 'setBreadcrumbs');

  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([]);

      await act(async () => {
        testBed = await setup(httpSetup);
      });

      const { component } = testBed;

      component.update();
    });

    test('updates the breadcrumbs to indices', () => {
      expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
        IndexManagementBreadcrumb.indices
      );
    });

    test('toggles the include hidden button through URL hash correctly', () => {
      const { actions } = testBed;
      expect(actions.getIncludeHiddenIndicesToggleStatus()).toBe(true);
      actions.clickIncludeHiddenIndicesToggle();
      expect(actions.getIncludeHiddenIndicesToggleStatus()).toBe(false);
      // Note: this test modifies the shared location.hash state, we put it back the way it was
      actions.clickIncludeHiddenIndicesToggle();
      expect(actions.getIncludeHiddenIndicesToggleStatus()).toBe(true);
    });
  });

  describe('data stream column', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([
        createDataStreamBackingIndex('data-stream-index', 'dataStream1'),
        createNonDataStreamIndex('no-data-stream-index'),
      ]);

      // The detail panel should still appear even if there are no data streams.
      httpRequestsMockHelpers.setLoadDataStreamsResponse([]);

      httpRequestsMockHelpers.setLoadDataStreamResponse(
        'dataStream1',
        createDataStreamPayload({ name: 'dataStream1' })
      );

      await act(async () => {
        testBed = await setup(httpSetup, {
          history: createMemoryHistory(),
        });
      });
      testBed.component.update();
    });

    test('navigates to the data stream in the Data Streams tab', async () => {
      const {
        findDataStreamDetailPanel,
        findDataStreamDetailPanelTitle,
        actions: { clickDataStreamAt, dataStreamLinkExistsAt },
      } = testBed;

      expect(dataStreamLinkExistsAt(0)).toBeTruthy();
      await clickDataStreamAt(0);

      expect(findDataStreamDetailPanel().length).toBe(1);
      expect(findDataStreamDetailPanelTitle()).toBe('dataStream1');
    });

    test(`doesn't show data stream link if the index doesn't have a data stream`, () => {
      const {
        actions: { dataStreamLinkExistsAt },
      } = testBed;

      expect(dataStreamLinkExistsAt(1)).toBeFalsy();
    });
  });

  it('navigates to the index details page when the index name is clicked', async () => {
    const indexName = 'testIndex';
    httpRequestsMockHelpers.setLoadIndicesResponse([createNonDataStreamIndex(indexName)]);
    httpRequestsMockHelpers.setLoadIndexDetailsResponse(
      indexName,
      createNonDataStreamIndex(indexName)
    );

    const application = applicationServiceMock.createStartContract();
    testBed = await setup(httpSetup, {
      history: createMemoryHistory(),
      core: {
        application,
      },
    });
    const { component, actions } = testBed;

    component.update();

    await actions.clickIndexNameAt(0);
    expect(application.navigateToUrl).toHaveBeenCalledWith(
      '/app/management/data/index_management/indices/index_details?indexName=testIndex&includeHiddenIndices=true'
    );
  });

  it('index page works with % character in index name', async () => {
    const indexName = 'test%';
    httpRequestsMockHelpers.setLoadIndicesResponse([createNonDataStreamIndex(indexName)]);
    httpRequestsMockHelpers.setLoadIndexDetailsResponse(
      encodeURIComponent(indexName),
      createNonDataStreamIndex(indexName)
    );

    const application = applicationServiceMock.createStartContract();
    testBed = await setup(httpSetup, {
      history: createMemoryHistory(),
      core: {
        application,
      },
    });
    const { component, actions } = testBed;

    component.update();

    await actions.clickIndexNameAt(0);
    expect(application.navigateToUrl).toHaveBeenCalledWith(
      '/app/management/data/index_management/indices/index_details?indexName=test%25&includeHiddenIndices=true'
    );
  });

  describe('empty list component', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([]);
      await act(async () => {
        testBed = await setup(httpSetup);
      });
      testBed.component.update();
    });

    test('renders the default empty list content', () => {
      expect(testBed.exists('createIndexMessage')).toBe(true);
    });

    it('renders "no indices found" prompt for search', async () => {
      const { find, component, exists } = testBed;
      await act(async () => {
        find('indicesSearch').simulate('change', { target: { value: 'non-existing-index' } });
      });
      component.update();

      expect(exists('noIndicesMessage')).toBe(true);

      find('clearIndicesSearch').simulate('click');
      component.update();

      expect(exists('noIndicesMessage')).toBe(false);
    });
  });

  describe('index actions', () => {
    const indexNameA = 'testIndexA';
    const indexNameB = 'testIndexB';
    const indexMockA = createNonDataStreamIndex(indexNameA);
    const indexMockB = createNonDataStreamIndex(indexNameB);

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([
        {
          ...indexMockA,
          isFrozen: true,
        },
        {
          ...indexMockB,
          status: 'closed',
        },
      ]);
      httpRequestsMockHelpers.setReloadIndicesResponse({ indexNames: [indexNameA, indexNameB] });

      await act(async () => {
        testBed = await setup(httpSetup);
      });

      const { component, find } = testBed;
      component.update();

      find('indexTableRowCheckbox')
        .at(0)
        .simulate('change', { target: { checked: true } });
    });

    test('should be able to refresh index', async () => {
      const { actions } = testBed;

      await actions.clickManageContextMenuButton();
      await actions.clickContextMenuOption('refreshIndexMenuButton');

      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/refresh`,
        expect.anything()
      );
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/reload`,
        expect.anything()
      );
    });

    test('should be able to close an open index', async () => {
      const { actions } = testBed;

      await actions.clickManageContextMenuButton();
      await actions.clickContextMenuOption('closeIndexMenuButton');

      // After the index is closed, we imediately do a reload. So we need to expect to see
      // a reload server call also.
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/close`,
        expect.anything()
      );
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/reload`,
        expect.anything()
      );
    });

    test('should be able to open a closed index', async () => {
      await act(async () => {
        testBed = await setup(httpSetup);
      });
      const { component, find, actions } = testBed;

      component.update();

      find('indexTableRowCheckbox')
        .at(1)
        .simulate('change', { target: { checked: true } });

      await actions.clickManageContextMenuButton();
      await actions.clickContextMenuOption('openIndexMenuButton');

      // After the index is opened, we imediately do a reload. So we need to expect to see
      // a reload server call also.
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/open`,
        expect.anything()
      );
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/reload`,
        expect.anything()
      );
    });

    test('should be able to flush index', async () => {
      const { actions } = testBed;

      await actions.clickManageContextMenuButton();
      await actions.clickContextMenuOption('flushIndexMenuButton');

      // After the index is flushed, we imediately do a reload. So we need to expect to see
      // a reload server call also.
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/flush`,
        expect.anything()
      );
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/reload`,
        expect.anything()
      );
    });

    test("should be able to clear an index's cache", async () => {
      const { actions } = testBed;

      await actions.clickManageContextMenuButton();
      await actions.clickContextMenuOption('clearCacheIndexMenuButton');

      // After the index cache is cleared, we imediately do a reload. So we need to expect to see
      // a reload server call also.
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/clear_cache`,
        expect.anything()
      );
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/reload`,
        expect.anything()
      );
    });

    test('should be able to force merge an index', async () => {
      const { actions, exists } = testBed;

      httpRequestsMockHelpers.setReloadIndicesResponse([{ ...indexMockA, isFrozen: false }]);

      // Open context menu
      await actions.clickManageContextMenuButton();
      // Check that the force merge action exists for the current index and merge it
      expect(exists('forcemergeIndexMenuButton')).toBe(true);
      await actions.clickContextMenuOption('forcemergeIndexMenuButton');

      await actions.clickModalConfirm();

      // After the index force merged, we imediately do a reload. So we need to expect to see
      // a reload server call also.
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/forcemerge`,
        expect.anything()
      );
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/reload`,
        expect.anything()
      );
    });
  });

  describe('Index stats', () => {
    const indexName = 'test';

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([createNonDataStreamIndex(indexName)]);

      await act(async () => {
        testBed = await setup(httpSetup);
      });

      const { component } = testBed;

      component.update();
    });

    test('renders the table column with all index stats when enableIndexStats is true', () => {
      const { table } = testBed;
      const { tableCellsValues } = table.getMetaData('indexTable');

      expect(tableCellsValues).toEqual([
        ['', 'test', 'green', 'open', '1', '1', '10,000', '156kb', ''],
      ]);
    });

    describe('renders only size and docs count when enableIndexStats is false, enableSizeAndDocCount is true', () => {
      beforeEach(async () => {
        await act(async () => {
          testBed = await setup(httpSetup, {
            config: {
              enableLegacyTemplates: true,
              enableIndexActions: true,
              enableIndexStats: false,
              enableSizeAndDocCount: true,
            },
          });
        });

        const { component } = testBed;

        component.update();
      });

      test('hides some index stats information from table', async () => {
        const { table } = testBed;
        const { tableCellsValues } = table.getMetaData('indexTable');

        expect(tableCellsValues).toEqual([['', 'test', '10,000', '156kb', '']]);
      });
    });

    describe('renders no index stats when enableIndexStats is false, enableSizeAndDocCount is false', () => {
      beforeEach(async () => {
        await act(async () => {
          testBed = await setup(httpSetup, {
            config: {
              enableLegacyTemplates: true,
              enableIndexActions: true,
              enableIndexStats: false,
              enableSizeAndDocCount: false,
            },
          });
        });

        const { component } = testBed;

        component.update();
      });

      test('hides all index stats information from table', async () => {
        const { table } = testBed;
        const { tableCellsValues } = table.getMetaData('indexTable');

        expect(tableCellsValues).toEqual([['', 'test', '']]);
      });
    });
  });

  describe('Create Index', () => {
    const indexNameA = 'test-index-a';
    const indexNameB = 'test-index-b';
    const indexMockA = createNonDataStreamIndex(indexNameA);

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([
        {
          ...indexMockA,
        },
      ]);

      await act(async () => {
        testBed = await setup(httpSetup, {
          history: createMemoryHistory(),
        });
      });
      testBed.component.update();
    });

    test('shows the create index button', async () => {
      const { exists } = testBed;

      expect(exists('createIndexButton')).toBe(true);
    });

    test('can open & close the create index modal', async () => {
      const { exists, actions } = testBed;

      await actions.clickCreateIndexButton();

      expect(exists('createIndexNameFieldText')).toBe(true);

      await actions.clickCreateIndexCancelButton();

      expect(exists('createIndexNameFieldText')).toBe(false);
    });

    test('creating an index', async () => {
      const { component, exists, find, actions } = testBed;

      expect(httpSetup.get).toHaveBeenCalledTimes(1);
      expect(httpSetup.get).toHaveBeenNthCalledWith(1, '/api/index_management/indices');

      await actions.clickCreateIndexButton();

      expect(exists('createIndexNameFieldText')).toBe(true);
      await act(async () => {
        find('createIndexNameFieldText').simulate('change', { target: { value: indexNameB } });
      });
      component.update();

      await actions.selectIndexMode('indexModeLookupOption');

      await actions.clickCreateIndexSaveButton();

      // Saves the index with expected name
      expect(httpSetup.put).toHaveBeenCalledWith(`${INTERNAL_API_BASE_PATH}/indices/create`, {
        body: '{"indexName":"test-index-b","indexMode":"lookup"}',
      });
      // It refresh indices after saving
      expect(httpSetup.get).toHaveBeenCalledTimes(2);
      expect(httpSetup.get).toHaveBeenNthCalledWith(2, '/api/index_management/indices');
    });
  });

  describe('extensions service', () => {
    it('displays an empty list content if set via extensions service', async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([]);
      await act(async () => {
        testBed = await setup(httpSetup, {
          services: {
            extensionsService: {
              _emptyListContent: {
                renderContent: () => {
                  return <div>Empty list content</div>;
                },
              },
            },
          },
        });
      });
      testBed.component.update();

      expect(testBed.component.text()).toContain('Empty list content');
    });

    it('renders additional columns registered via extensions service', async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([
        {
          ...createNonDataStreamIndex('test-index'),
          ilm: {
            phase: 'hot phase',
            managed: true,
          },
        },
      ]);
      await act(async () => {
        testBed = await setup(httpSetup, {
          services: {
            extensionsService: {
              _columns: [
                {
                  fieldName: 'ilm.phase',
                  label: 'ILM column 1',
                  order: 55,
                },
                {
                  fieldName: 'ilm.managed',
                  label: 'ILM column 2',
                  order: 56,
                  render: (index: Index) => {
                    if (index.ilm?.managed) {
                      return <div>ILM managed</div>;
                    }
                  },
                },
              ],
            },
          },
        });
      });
      testBed.component.update();

      const text = testBed.component.text();
      expect(text).toContain('ILM column 1');
      expect(text).toContain('hot phase');
      expect(text).toContain('ILM column 2');
      expect(text).toContain('ILM managed');
    });
    it('renders to search_indices index details page', async () => {
      const indexName = 'search-index';
      httpRequestsMockHelpers.setLoadIndicesResponse([createNonDataStreamIndex(indexName)]);
      httpRequestsMockHelpers.setLoadIndexDetailsResponse(
        indexName,
        createNonDataStreamIndex(indexName)
      );

      const navigateToUrl = jest.fn();
      const url = `/app/elasticsearch/indices/index_details/${indexName}`;
      testBed = await setup(httpSetup, {
        core: {
          application: { navigateToUrl },
        },
        history: createMemoryHistory(),
        services: {
          extensionsService: {
            _indexDetailsPageRoute: {
              renderRoute: () => {
                return url;
              },
            },
          },
        },
      });
      testBed.component.update();
      await testBed.actions.clickIndexNameAt(0);
      expect(navigateToUrl).toHaveBeenCalledTimes(1);
      expect(navigateToUrl).toHaveBeenCalledWith(url);
    });
  });
});
