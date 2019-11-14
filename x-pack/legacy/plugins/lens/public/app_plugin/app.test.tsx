/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { App } from './app';
import { EditorFrameInstance } from '../types';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';
import { Document, SavedObjectStore } from '../persistence';
import { mount } from 'enzyme';
import { esFilters } from '../../../../../../src/plugins/data/public';

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

const { TopNavMenu } = navigation.ui;

jest.mock('ui/new_platform');
jest.mock('../persistence');
jest.mock('src/core/public');

const waitForPromises = () => new Promise(resolve => setTimeout(resolve));

function createMockFrame(): jest.Mocked<EditorFrameInstance> {
  return {
    mount: jest.fn((el, props) => {}),
    unmount: jest.fn(() => {}),
  };
}

function createMockFilterManager() {
  const unsubscribe = jest.fn();

  let subscriber: () => void;
  let filters: unknown = [];

  return {
    getUpdates$: () => ({
      subscribe: ({ next }: { next: () => void }) => {
        subscriber = next;
        return unsubscribe;
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
  let frame: jest.Mocked<EditorFrameInstance>;
  let core: ReturnType<typeof coreMock['createStart']>;

  function makeDefaultArgs(): jest.Mocked<{
    editorFrame: EditorFrameInstance;
    data: typeof dataStartMock;
    core: typeof core;
    dataShim: DataStart;
    storage: Storage;
    docId?: string;
    docStorage: SavedObjectStore;
    redirectTo: (id?: string) => void;
  }> {
    return ({
      editorFrame: createMockFrame(),
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
        timefilter: { history: {} },
      },
      storage: {
        get: jest.fn(),
      },
      docStorage: {
        load: jest.fn(),
        save: jest.fn(),
      },
      redirectTo: jest.fn(id => {}),
    } as unknown) as jest.Mocked<{
      editorFrame: EditorFrameInstance;
      data: typeof dataStartMock;
      core: typeof core;
      dataShim: DataStart;
      storage: Storage;
      docId?: string;
      docStorage: SavedObjectStore;
      redirectTo: (id?: string) => void;
    }>;
  }

  beforeEach(() => {
    frame = createMockFrame();
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
    args.editorFrame = frame;

    mount(<App {...args} />);

    expect(frame.mount.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <div
            class="lnsApp__frame"
          />,
          Object {
            "dateRange": Object {
              "fromDate": "now-7d",
              "toDate": "now",
            },
            "doc": undefined,
            "filters": Array [],
            "onChange": [Function],
            "onError": [Function],
            "query": Object {
              "language": "kuery",
              "query": "",
            },
            "savedQuery": undefined,
          },
        ],
      ]
    `);
  });

  it('sets breadcrumbs when the document title changes', async () => {
    const defaultArgs = makeDefaultArgs();
    const instance = mount(<App {...defaultArgs} />);

    expect(core.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Visualize', href: '/testbasepath/app/kibana#/visualize' },
      { text: 'Create' },
    ]);

    (defaultArgs.docStorage.load as jest.Mock).mockResolvedValue({
      id: '1234',
      title: 'Daaaaaaadaumching!',
      state: {
        query: 'fake query',
        datasourceMetaData: { filterableIndexPatterns: [{ id: '1', title: 'saved' }] },
      },
    });

    instance.setProps({ docId: '1234' });
    await waitForPromises();

    expect(defaultArgs.core.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Visualize', href: '/testbasepath/app/kibana#/visualize' },
      { text: 'Daaaaaaadaumching!' },
    ]);
  });

  describe('persistence', () => {
    it('does not load a document if there is no document id', () => {
      const args = makeDefaultArgs();

      mount(<App {...args} />);

      expect(args.docStorage.load).not.toHaveBeenCalled();
    });

    it('loads a document and uses query if there is a document id', async () => {
      const args = makeDefaultArgs();
      args.editorFrame = frame;
      (args.docStorage.load as jest.Mock).mockResolvedValue({
        id: '1234',
        state: {
          query: 'fake query',
          datasourceMetaData: { filterableIndexPatterns: [{ id: '1', title: 'saved' }] },
        },
      });

      const instance = mount(<App {...args} />);

      instance.setProps({ docId: '1234' });
      await waitForPromises();

      expect(args.docStorage.load).toHaveBeenCalledWith('1234');
      expect(args.dataShim.indexPatterns.indexPatterns.get).toHaveBeenCalledWith('1');
      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'fake query',
          indexPatterns: [{ id: '1' }],
        }),
        {}
      );
      expect(frame.mount).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({
          doc: {
            id: '1234',
            state: {
              query: 'fake query',
              datasourceMetaData: { filterableIndexPatterns: [{ id: '1', title: 'saved' }] },
            },
          },
        })
      );
    });

    it('does not load documents on sequential renders unless the id changes', async () => {
      const args = makeDefaultArgs();
      args.editorFrame = frame;
      (args.docStorage.load as jest.Mock).mockResolvedValue({ id: '1234' });

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
      args.editorFrame = frame;
      (args.docStorage.load as jest.Mock).mockRejectedValue('failed to load');

      const instance = mount(<App {...args} />);

      instance.setProps({ docId: '1234' });
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
        args.editorFrame = frame;
        (args.docStorage.load as jest.Mock).mockResolvedValue({
          id: '1234',
          state: {
            query: 'fake query',
            datasourceMetaData: { filterableIndexPatterns: [{ id: '1', title: 'saved' }] },
          },
        });
        (args.docStorage.save as jest.Mock).mockImplementation(async ({ id }) => ({
          id: id || 'aaa',
        }));

        const instance = mount(<App {...args} />);

        await waitForPromises();

        if (initialDocId) {
          expect(args.docStorage.load).toHaveBeenCalledTimes(1);
        } else {
          expect(args.docStorage.load).not.toHaveBeenCalled();
        }

        const onChange = frame.mount.mock.calls[0][1].onChange;
        onChange({
          filterableIndexPatterns: [],
          doc: ({ id: initialDocId } as unknown) as Document,
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
        args.editorFrame = frame;

        const instance = mount(<App {...args} />);

        expect(getButton(instance).disableButton).toEqual(true);

        const onChange = frame.mount.mock.calls[0][1].onChange;
        onChange({ filterableIndexPatterns: [], doc: ('will save this' as unknown) as Document });

        instance.update();

        expect(getButton(instance).disableButton).toEqual(true);
      });

      it('shows a save button that is enabled when the frame has provided its state', async () => {
        const args = makeDefaultArgs();
        args.editorFrame = frame;

        const instance = mount(<App {...args} />);

        expect(getButton(instance).disableButton).toEqual(true);

        const onChange = frame.mount.mock.calls[0][1].onChange;
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

        expect(args.docStorage.save).toHaveBeenCalledWith({
          id: undefined,
          title: 'hello there',
        });

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

        expect(args.docStorage.save).toHaveBeenCalledWith({
          id: undefined,
          title: 'hello there',
        });

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

        expect(args.docStorage.save).toHaveBeenCalledWith({
          id: '1234',
          title: 'hello there',
        });

        expect(args.redirectTo).not.toHaveBeenCalled();

        instance.setProps({ docId: '1234' });

        expect(args.docStorage.load).toHaveBeenCalledTimes(1);
      });

      it('handles save failure by showing a warning, but still allows another save', async () => {
        const args = makeDefaultArgs();
        args.editorFrame = frame;
        (args.docStorage.save as jest.Mock).mockRejectedValue({ message: 'failed' });

        const instance = mount(<App {...args} />);

        const onChange = frame.mount.mock.calls[0][1].onChange;
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
      args.editorFrame = frame;

      mount(<App {...args} />);

      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { query: '', language: 'kuery' },
          dateRangeFrom: 'now-7d',
          dateRangeTo: 'now',
        }),
        {}
      );
      expect(frame.mount).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({
          dateRange: { fromDate: 'now-7d', toDate: 'now' },
          query: { query: '', language: 'kuery' },
        })
      );
    });

    it('updates the index patterns when the editor frame is changed', async () => {
      const args = makeDefaultArgs();
      args.editorFrame = frame;

      const instance = mount(<App {...args} />);

      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          indexPatterns: [],
        }),
        {}
      );

      const onChange = frame.mount.mock.calls[0][1].onChange;
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
      args.editorFrame = frame;

      const instance = mount(<App {...args} />);

      instance.find(TopNavMenu).prop('onQuerySubmit')!({
        dateRange: { from: 'now-14d', to: 'now-7d' },
        query: { query: 'new', language: 'lucene' },
      });

      instance.update();

      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { query: 'new', language: 'lucene' },
          dateRangeFrom: 'now-14d',
          dateRangeTo: 'now-7d',
        }),
        {}
      );
      expect(frame.mount).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({
          dateRange: { fromDate: 'now-14d', toDate: 'now-7d' },
          query: { query: 'new', language: 'lucene' },
        })
      );
    });

    it('updates the filters when the user changes them', () => {
      const args = makeDefaultArgs();
      args.editorFrame = frame;

      const instance = mount(<App {...args} />);

      args.data.query.filterManager.setFilters([
        esFilters.buildExistsFilter({ name: 'myfield' }, { id: 'index1' }),
      ]);

      instance.update();

      expect(frame.mount).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({
          filters: [esFilters.buildExistsFilter({ name: 'myfield' }, { id: 'index1' })],
        })
      );
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
      args.editorFrame = frame;

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
      args.editorFrame = frame;

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
      args.editorFrame = frame;

      const instance = mount(<App {...args} />);

      instance.find(TopNavMenu).prop('onQuerySubmit')!({
        dateRange: { from: 'now-14d', to: 'now-7d' },
        query: { query: 'new', language: 'lucene' },
      });

      args.data.query.filterManager.setFilters([
        esFilters.buildExistsFilter({ name: 'myfield' }, { id: 'index1' }),
      ]);
      instance.update();

      instance.find(TopNavMenu).prop('onClearSavedQuery')!();
      instance.update();

      expect(frame.mount).toHaveBeenLastCalledWith(
        expect.any(Element),
        expect.objectContaining({
          filters: [],
        })
      );
    });
  });

  it('displays errors from the frame in a toast', () => {
    const args = makeDefaultArgs();
    args.editorFrame = frame;

    const instance = mount(<App {...args} />);

    const onError = frame.mount.mock.calls[0][1].onError;
    onError({ message: 'error' });

    instance.update();

    expect(args.core.notifications.toasts.addDanger).toHaveBeenCalled();
  });
});
