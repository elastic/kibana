/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { App, Props } from './app';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';
import { Document, SavedObjectStore } from '../persistence';
import { mount } from 'enzyme';
import { esFilters, IFieldType, IIndexPattern } from '../../../../../../src/plugins/data/public';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
const dataStartMock = dataPluginMock.createStartContract();

import { TopNavMenuData } from '../../../../../../src/legacy/core_plugins/navigation/public';
import { DataStart } from '../../../../../../src/legacy/core_plugins/data/public';
import { coreMock } from 'src/core/public/mocks';

jest.mock('../../../../../../src/legacy/core_plugins/navigation/public/legacy', () => ({
  start: {
    ui: {
      TopNavMenu: jest.fn(() => null),
    },
  },
}));

import { start as navigation } from '../../../../../../src/legacy/core_plugins/navigation/public/legacy';
import { createMockDatasource, createMockVisualization } from '../editor_frame/mocks';

const { TopNavMenu } = navigation.ui;

jest.mock('ui/new_platform');
jest.mock('../persistence');
jest.mock('src/core/public');

const waitForPromises = () => new Promise(resolve => setTimeout(resolve));

function createMockFilterManager() {
  const unsubscribe = jest.fn();

  let subscriber: () => void;
  let filters: unknown = [];

  return {
    getUpdates$: () => ({
      subscribe: ({ next }: { next: () => void }) => {
        subscriber = next;
        return { unsubscribe };
      },
    }),
    setFilters: (newFilters: unknown[]) => {
      filters = newFilters;
      subscriber();
    },
    getFilters: () => filters,
    removeAll: () => {
      filters = [];
      subscriber();
    },
  };
}

describe('Lens App', () => {
  let core: ReturnType<typeof coreMock['createStart']>;

  function makeDefaultArgs(): jest.Mocked<Props> {
    return ({
      datasourceMap: {
        ds1: createMockDatasource(),
      },
      visualizationMap: {
        v1: createMockVisualization(),
      },
      core: {
        ...core,
        application: {
          ...core.application,
          capabilities: {
            ...core.application.capabilities,
            visualize: { save: true, saveQuery: true, show: true },
          },
        },
      },
      data: {
        query: {
          filterManager: createMockFilterManager(),
          timefilter: {
            timefilter: {
              getTime: jest.fn(() => ({ from: 'now-7d', to: 'now' })),
              setTime: jest.fn(),
            },
          },
        },
      },
      dataShim: {
        indexPatterns: {
          indexPatterns: {
            get: jest.fn(id => {
              return new Promise(resolve => resolve({ id }));
            }),
          },
        },
      },
      storage: {
        get: jest.fn(),
      },
      docStorage: {
        load: jest.fn(() =>
          Promise.resolve({
            id: '1234',
            title: 'Daaaaaaadaumching!',
            state: {
              query: 'fake query',
              datasourceMetaData: { filterableIndexPatterns: [{ id: '1', title: 'saved' }] },
              datasourceStates: { ds1: {} },
            },
          })
        ),
        save: jest.fn(),
      },
      redirectTo: jest.fn(id => {}),
    } as unknown) as jest.Mocked<Props>;
  }

  beforeEach(() => {
    core = coreMock.createStart({ basePath: '/testbasepath' });

    core.uiSettings.get.mockImplementation(
      jest.fn(type => {
        if (type === 'timepicker:timeDefaults') {
          return { from: 'now-7d', to: 'now' };
        } else if (type === 'search:queryLanguage') {
          return 'kuery';
        } else {
          return [];
        }
      })
    );
  });

  it('renders the editor frame', () => {
    const args = makeDefaultArgs();
    const instance = mount(<App {...args} />);
    const frame = instance.find('[data-test-subj="lnsEditorFrame"]').first();

    expect(frame.exists()).toBeTruthy();
  });

  it('sets breadcrumbs when the document title changes', async () => {
    const defaultArgs = makeDefaultArgs();

    mount(<App {...defaultArgs} docId="1234" />);

    expect(core.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Visualize', href: '/testbasepath/app/kibana#/visualize' },
      { text: 'Create' },
    ]);

    await waitForPromises();

    expect(defaultArgs.core.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Visualize', href: '/testbasepath/app/kibana#/visualize' },
      { text: 'Daaaaaaadaumching!' },
    ]);
  });

  it('displays errors from the frame in a toast', () => {
    const args = makeDefaultArgs();
    const instance = mount(<App {...args} />);
    const frame = instance.find('[data-test-subj="lnsEditorFrame"]').first();
    const onError = (frame.prop('onError') as unknown) as (e: { message: string }) => void;

    onError({ message: 'error' });

    instance.update();

    expect(args.core.notifications.toasts.addDanger).toHaveBeenCalled();
  });

  describe('persistence', () => {
    it('does not load a document if there is no document id', () => {
      const args = makeDefaultArgs();

      mount(<App {...args} />);

      expect(args.docStorage.load).not.toHaveBeenCalled();
    });

    it('loads a document and uses query if there is a document id', async () => {
      const args = makeDefaultArgs();
      const instance = mount(<App {...args} docId="1234" />);

      await waitForPromises();
      instance.update();

      expect(args.docStorage.load).toHaveBeenCalledWith('1234');
      expect(args.dataShim.indexPatterns.indexPatterns.get).toHaveBeenCalledWith('1');
      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'fake query',
          indexPatterns: [{ id: '1' }],
        }),
        {}
      );

      const frame = instance.find('[data-test-subj="lnsEditorFrame"]').first();

      expect(frame.exists()).toBeTruthy();

      expect(frame.prop('doc')).toMatchObject({
        id: '1234',
        state: {
          query: 'fake query',
          datasourceMetaData: { filterableIndexPatterns: [{ id: '1', title: 'saved' }] },
        },
      });
    });

    it('does not load documents on sequential renders unless the id changes', async () => {
      const args = makeDefaultArgs();
      const instance = mount(<App {...args} />);

      instance.setProps({ docId: '1234' });
      await waitForPromises();
      instance.setProps({ docId: '1234' });
      await waitForPromises();

      expect(args.docStorage.load).toHaveBeenCalledTimes(1);

      instance.setProps({ docId: '9876' });
      await waitForPromises();

      expect(args.docStorage.load).toHaveBeenCalledTimes(2);
    });

    it('handles document load errors', async () => {
      const args = makeDefaultArgs();

      (args.docStorage.load as jest.Mock).mockRejectedValue('failed to load');

      mount(<App {...args} docId="1234" />);

      await waitForPromises();

      expect(args.docStorage.load).toHaveBeenCalledWith('1234');
      expect(args.core.notifications.toasts.addDanger).toHaveBeenCalled();
      expect(args.redirectTo).toHaveBeenCalled();
    });

    describe('save button', () => {
      interface SaveProps {
        newCopyOnSave: boolean;
        newTitle: string;
      }

      function getButton(instance: ReactWrapper): TopNavMenuData {
        return (instance
          .find('[data-test-subj="lnsApp_topNav"]')
          .prop('config') as TopNavMenuData[]).find(
          button => button.testId === 'lnsApp_saveButton'
        )!;
      }

      function testSave(instance: ReactWrapper, saveProps: SaveProps) {
        act(() => {
          getButton(instance).run(instance.getDOMNode());
        });

        instance.update();

        const handler = instance.findWhere(el => el.prop('onSave')).prop('onSave') as (
          p: unknown
        ) => void;
        handler(saveProps);
      }

      async function save({
        initialDocId,
        ...saveProps
      }: SaveProps & {
        initialDocId?: string;
      }) {
        const args = {
          ...makeDefaultArgs(),
          docId: initialDocId,
        };

        (args.docStorage.load as jest.Mock).mockResolvedValue({
          id: '1234',
          state: {
            query: 'fake query',
            datasourceMetaData: { filterableIndexPatterns: [{ id: '1', title: 'saved' }] },
            datasourceStates: { ds1: {} },
          },
        });
        (args.docStorage.save as jest.Mock).mockImplementation(async ({ id }) => ({
          id: id || 'aaa',
        }));

        const instance = mount(<App {...args} />);

        if (initialDocId) {
          expect(args.docStorage.load).toHaveBeenCalledTimes(1);
        } else {
          expect(args.docStorage.load).not.toHaveBeenCalled();
        }

        await waitForPromises();
        instance.update();

        const frame = instance.find('[data-test-subj="lnsEditorFrame"]').first();
        const onChange = frame.prop('onChange') as (x: unknown) => void;
        onChange({
          filterableIndexPatterns: [],
          doc: {
            id: initialDocId,
            visualizationType: 'vs1',
            expression: '',
            title: saveProps.newTitle,
            state: {
              datasourceMetaData: {
                filterableIndexPatterns: [],
              },
              datasourceStates: { ds1: {} },
              filters: [],
              query: { query: '', language: 'kql' },
              visualization: {},
            },
          } as Document,
        });

        instance.update();

        expect(getButton(instance).disableButton).toEqual(false);

        testSave(instance, saveProps);

        await waitForPromises();

        return { args, instance };
      }

      it('shows a disabled save button when the user does not have permissions', async () => {
        const args = makeDefaultArgs();

        args.core.application = {
          ...args.core.application,
          capabilities: {
            ...args.core.application.capabilities,
            visualize: { save: false, saveQuery: false, show: true },
          },
        };

        const instance = mount(<App {...args} />);

        expect(getButton(instance).disableButton).toEqual(true);

        const frame = instance.find('[data-test-subj="lnsEditorFrame"]').first();
        const onChange = frame.prop('onChange') as (x: unknown) => void;

        onChange({ filterableIndexPatterns: [], doc: ('will save this' as unknown) as Document });

        instance.update();

        expect(getButton(instance).disableButton).toEqual(true);
      });

      it('shows a save button that is enabled when the frame has provided its state', async () => {
        const args = makeDefaultArgs();
        const instance = mount(<App {...args} />);

        expect(getButton(instance).disableButton).toEqual(true);

        const frame = instance.find('[data-test-subj="lnsEditorFrame"]').first();
        const onChange = frame.prop('onChange') as (x: unknown) => void;

        onChange({ filterableIndexPatterns: [], doc: ('will save this' as unknown) as Document });

        instance.update();

        expect(getButton(instance).disableButton).toEqual(false);
      });

      it('saves new docs', async () => {
        const { args, instance } = await save({
          initialDocId: undefined,
          newCopyOnSave: false,
          newTitle: 'hello there',
        });

        expect(args.docStorage.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: undefined,
            title: 'hello there',
          })
        );

        expect(args.redirectTo).toHaveBeenCalledWith('aaa');

        instance.setProps({ docId: 'aaa' });

        expect(args.docStorage.load).not.toHaveBeenCalled();
      });

      it('saves the latest doc as a copy', async () => {
        const { args, instance } = await save({
          initialDocId: '1234',
          newCopyOnSave: true,
          newTitle: 'hello there',
        });

        expect(args.docStorage.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: undefined,
            title: 'hello there',
          })
        );

        expect(args.redirectTo).toHaveBeenCalledWith('aaa');

        instance.setProps({ docId: 'aaa' });

        expect(args.docStorage.load).toHaveBeenCalledTimes(1);
      });

      it('saves existing docs', async () => {
        const { args, instance } = await save({
          initialDocId: '1234',
          newCopyOnSave: false,
          newTitle: 'hello there',
        });

        expect(args.docStorage.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: '1234',
            title: 'hello there',
          })
        );

        expect(args.redirectTo).not.toHaveBeenCalled();

        instance.setProps({ docId: '1234' });

        expect(args.docStorage.load).toHaveBeenCalledTimes(1);
      });

      it('handles save failure by showing a warning, but still allows another save', async () => {
        const args = makeDefaultArgs();

        (args.docStorage.save as jest.Mock).mockRejectedValue({ message: 'failed' });

        const instance = mount(<App {...args} />);
        const frame = instance.find('[data-test-subj="lnsEditorFrame"]').first();
        const onChange = frame.prop('onChange') as (x: unknown) => void;

        onChange({ filterableIndexPatterns: [], doc: ({ id: undefined } as unknown) as Document });

        instance.update();

        testSave(instance, { newCopyOnSave: false, newTitle: 'hello there' });

        await waitForPromises();

        expect(args.core.notifications.toasts.addDanger).toHaveBeenCalled();
        expect(args.redirectTo).not.toHaveBeenCalled();
        await waitForPromises();

        expect(getButton(instance).disableButton).toEqual(false);
      });
    });
  });

  describe('query bar state management', () => {
    it('uses the default time and query language settings', () => {
      const args = makeDefaultArgs();
      const instance = mount(<App {...args} />);
      const frame = instance.find('[data-test-subj="lnsEditorFrame"]').first();

      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { query: '', language: 'kuery' },
          dateRangeFrom: 'now-7d',
          dateRangeTo: 'now',
        }),
        {}
      );
      expect(frame.prop('dateRange')).toEqual({ fromDate: 'now-7d', toDate: 'now' });
      expect(frame.prop('query')).toEqual({ query: '', language: 'kuery' });
    });

    it('updates the index patterns when the editor frame is changed', async () => {
      const args = makeDefaultArgs();
      const instance = mount(<App {...args} />);
      const frame = instance.find('[data-test-subj="lnsEditorFrame"]').first();

      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          indexPatterns: [],
        }),
        {}
      );

      const onChange = frame.prop('onChange') as (x: unknown) => void;
      onChange({
        filterableIndexPatterns: [{ id: '1', title: 'newIndex' }],
        doc: ({ id: undefined } as unknown) as Document,
      });

      await waitForPromises();
      instance.update();

      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          indexPatterns: [{ id: '1' }],
        }),
        {}
      );

      // Do it again to verify that the dirty checking is done right
      onChange({
        filterableIndexPatterns: [{ id: '2', title: 'second index' }],
        doc: ({ id: undefined } as unknown) as Document,
      });

      await waitForPromises();
      instance.update();

      expect(TopNavMenu).toHaveBeenLastCalledWith(
        expect.objectContaining({
          indexPatterns: [{ id: '2' }],
        }),
        {}
      );
    });

    it('updates the editor frame when the user changes query or time in the search bar', () => {
      const args = makeDefaultArgs();
      const instance = mount(<App {...args} />);

      instance.find(TopNavMenu).prop('onQuerySubmit')!({
        dateRange: { from: 'now-14d', to: 'now-7d' },
        query: { query: 'new', language: 'lucene' },
      });

      instance.update();

      const frame = instance.find('[data-test-subj="lnsEditorFrame"]').first();

      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { query: 'new', language: 'lucene' },
          dateRangeFrom: 'now-14d',
          dateRangeTo: 'now-7d',
        }),
        {}
      );
      expect(frame.prop('dateRange')).toEqual({ fromDate: 'now-14d', toDate: 'now-7d' });
      expect(frame.prop('query')).toEqual({ query: 'new', language: 'lucene' });
    });

    it('updates the filters when the user changes them', () => {
      const args = makeDefaultArgs();
      const instance = mount(<App {...args} />);
      const indexPattern = ({ id: 'index1' } as unknown) as IIndexPattern;
      const field = ({ name: 'myfield' } as unknown) as IFieldType;

      args.data.query.filterManager.setFilters([esFilters.buildExistsFilter(field, indexPattern)]);

      instance.update();

      const frame = instance.find('[data-test-subj="lnsEditorFrame"]').first();

      expect(frame.prop('filters')).toEqual([esFilters.buildExistsFilter(field, indexPattern)]);
    });
  });

  describe('saved query handling', () => {
    it('does not allow saving when the user is missing the saveQuery permission', () => {
      const args = makeDefaultArgs();
      args.core.application = {
        ...args.core.application,
        capabilities: {
          ...args.core.application.capabilities,
          visualize: { save: false, saveQuery: false, show: true },
        },
      };

      mount(<App {...args} />);

      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({ showSaveQuery: false }),
        {}
      );
    });

    it('persists the saved query ID when the query is saved', () => {
      const args = makeDefaultArgs();
      const instance = mount(<App {...args} />);

      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          showSaveQuery: true,
          savedQuery: undefined,
          onSaved: expect.any(Function),
          onSavedQueryUpdated: expect.any(Function),
          onClearSavedQuery: expect.any(Function),
        }),
        {}
      );

      act(() => {
        instance.find(TopNavMenu).prop('onSaved')!({
          id: '1',
          attributes: {
            title: '',
            description: '',
            query: { query: '', language: 'lucene' },
          },
        });
      });

      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          savedQuery: {
            id: '1',
            attributes: {
              title: '',
              description: '',
              query: { query: '', language: 'lucene' },
            },
          },
        }),
        {}
      );
    });

    it('changes the saved query ID when the query is updated', () => {
      const args = makeDefaultArgs();
      const instance = mount(<App {...args} />);

      act(() => {
        instance.find(TopNavMenu).prop('onSaved')!({
          id: '1',
          attributes: {
            title: '',
            description: '',
            query: { query: '', language: 'lucene' },
          },
        });
      });

      act(() => {
        instance.find(TopNavMenu).prop('onSavedQueryUpdated')!({
          id: '2',
          attributes: {
            title: 'new title',
            description: '',
            query: { query: '', language: 'lucene' },
          },
        });
      });

      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          savedQuery: {
            id: '2',
            attributes: {
              title: 'new title',
              description: '',
              query: { query: '', language: 'lucene' },
            },
          },
        }),
        {}
      );
    });

    it('clears all existing filters when the active saved query is cleared', () => {
      const args = makeDefaultArgs();
      const instance = mount(<App {...args} />);

      instance.find(TopNavMenu).prop('onQuerySubmit')!({
        dateRange: { from: 'now-14d', to: 'now-7d' },
        query: { query: 'new', language: 'lucene' },
      });

      const indexPattern = ({ id: 'index1' } as unknown) as IIndexPattern;
      const field = ({ name: 'myfield' } as unknown) as IFieldType;

      args.data.query.filterManager.setFilters([esFilters.buildExistsFilter(field, indexPattern)]);
      instance.update();

      instance.find(TopNavMenu).prop('onClearSavedQuery')!();
      instance.update();

      const frame = instance.find('[data-test-subj="lnsEditorFrame"]').first();

      expect(frame.prop('filters')).toEqual([]);
    });
  });
});
