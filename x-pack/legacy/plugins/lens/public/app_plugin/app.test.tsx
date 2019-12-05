/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { App, Props } from './app';
import { Document } from '../persistence';
import { mount } from 'enzyme';
import { esFilters, IFieldType, IIndexPattern } from '../../../../../../src/plugins/data/public';
import { TopNavMenuData } from '../../../../../../src/legacy/core_plugins/navigation/public';
import { coreMock } from 'src/core/public/mocks';
import { waitForPromises } from '../test_helpers';
import { start as navigation } from '../../../../../../src/legacy/core_plugins/navigation/public/legacy';
import { createMockDatasource, createMockVisualization } from '../editor_frame/mocks';
import { createAppStateManager, State } from './app_state_manager';

jest.mock('../../../../../../src/legacy/core_plugins/navigation/public/legacy', () => ({
  start: {
    ui: {
      TopNavMenu: jest.fn(() => null),
    },
  },
}));

const { TopNavMenu } = navigation.ui;

function createMockFilterManager() {
  let filters: unknown = [];

  return {
    setFilters: jest.fn((newFilters: unknown[]) => {
      filters = newFilters;
    }),
    getFilters: () => filters,
    removeAll: jest.fn(() => {
      filters = [];
    }),
  };
}

function getSaveButton(instance: ReactWrapper): TopNavMenuData {
  return (instance
    .find('[data-test-subj="lnsApp_topNav"]')
    .prop('config') as TopNavMenuData[]).find(button => button.testId === 'lnsApp_saveButton')!;
}

describe('Lens App', () => {
  let core: ReturnType<typeof coreMock['createStart']>;

  function makeDefaultArgs(testState: Partial<State> = {}): jest.Mocked<Props> {
    const stateManager = createAppStateManager({
      dateRange: { fromDate: 'now-7d', toDate: 'now' },
      language: 'kql',
    });

    stateManager.setState(s => ({ ...s, ...testState }));

    return ({
      stateManager,
      state: stateManager.getState(),
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
        save: jest.fn(),
      },
      redirectTo: jest.fn(() => {}),
    } as unknown) as jest.Mocked<Props>;
  }

  async function testSave({
    lastKnownDoc,
    newTitle,
    newCopyOnSave,
    save,
  }: {
    lastKnownDoc: Partial<Document>;
    newTitle: string;
    newCopyOnSave: boolean;
    save?: () => Promise<unknown>;
  }) {
    const args = makeDefaultArgs({
      isSaveModalVisible: true,
      lastKnownDoc: (lastKnownDoc as unknown) as Document,
    });

    (args.docStorage.save as jest.Mock).mockImplementation(
      save ||
        (async ({ id }) => ({
          id: id || 'aaa',
        }))
    );

    const instance = mount(<App {...args} />);

    act(() => {
      getSaveButton(instance).run(instance.getDOMNode());
    });

    instance.update();

    const handler = instance.findWhere(el => el.prop('onSave')).prop('onSave') as (
      p: unknown
    ) => void;

    handler({ newCopyOnSave, newTitle });

    await waitForPromises();

    return { ...args, instance };
  }

  beforeEach(() => {
    core = coreMock.createStart({ basePath: '/testbasepath' });
  });

  it('renders the editor frame', () => {
    const args = makeDefaultArgs();
    const instance = mount(<App {...args} />);
    const frame = instance.find('[data-test-subj="lnsEditorFrame"]').first();

    expect(frame.exists()).toBeTruthy();
  });

  it('displays errors from the frame in a toast', () => {
    const args = makeDefaultArgs();
    const instance = mount(<App {...args} />);
    const frame = instance.find('[data-test-subj="lnsEditorFrame"]').first();
    const onError = (frame.prop('onError') as unknown) as (e: { message: string }) => void;

    onError({ message: 'error' });

    expect(args.core.notifications.toasts.addDanger).toHaveBeenCalled();
  });

  describe('persistence', () => {
    describe('save button', () => {
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

        expect(getSaveButton(instance).disableButton).toEqual(true);

        const frame = instance.find('[data-test-subj="lnsEditorFrame"]').first();
        const onChange = frame.prop('onChange') as (x: unknown) => void;

        onChange({ filterableIndexPatterns: [], doc: ('will save this' as unknown) as Document });

        instance.update();

        expect(getSaveButton(instance).disableButton).toEqual(true);
      });

      it('shows a save button that is enabled when lastKnownDoc does not match saved doc', async () => {
        const args = makeDefaultArgs({
          lastKnownDoc: ({
            id: undefined,
            title: 'whatever',
          } as unknown) as Document,
        });

        const instance = mount(<App {...args} />);

        expect(getSaveButton(instance).disableButton).toEqual(false);
      });

      it('saves new docs', async () => {
        const args = await testSave({
          lastKnownDoc: { title: 'whatever' },
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
      });

      it('saves the latest doc as a copy', async () => {
        const args = await testSave({
          lastKnownDoc: { id: '1234', title: 'whatever' },
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
      });

      it('saves existing docs', async () => {
        const args = await testSave({
          lastKnownDoc: { id: '1234', title: '' },
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
      });

      it('handles save failure by showing a warning, but still allows another save', async () => {
        const { instance, ...args } = await testSave({
          lastKnownDoc: { title: 'whatever' },
          newCopyOnSave: false,
          newTitle: 'hello there',
          save: () => Promise.reject(new Error('failed')),
        });

        expect(args.core.notifications.toasts.addDanger).toHaveBeenCalled();
        expect(args.redirectTo).not.toHaveBeenCalled();
        await waitForPromises();

        expect(getSaveButton(instance).disableButton).toEqual(false);
      });
    });
  });

  describe('query bar state management', () => {
    it('uses the time and query language settings in state', () => {
      const args = makeDefaultArgs({
        query: { query: '', language: 'kuery' },
        dateRange: { fromDate: 'now-7d', toDate: 'now' },
      });
      const instance = mount(<App {...args} state={args.stateManager.getState()} />);
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

      expect(args.stateManager.getState().indexPatternsForTopNav).toEqual([{ id: '1' }]);

      // Do it again to verify that the dirty checking is done right
      onChange({
        filterableIndexPatterns: [{ id: '2', title: 'second index' }],
        doc: ({ id: undefined } as unknown) as Document,
      });

      await waitForPromises();

      expect(args.stateManager.getState().indexPatternsForTopNav).toEqual([{ id: '2' }]);
    });

    it('updates state when the user changes query or time in the search bar', () => {
      const args = makeDefaultArgs();
      const instance = mount(<App {...args} />);

      instance.find(TopNavMenu).prop('onQuerySubmit')!({
        dateRange: { from: 'now-14d', to: 'now-7d' },
        query: { query: 'new', language: 'lucene' },
      });

      expect(args.stateManager.getState().dateRange).toEqual({
        fromDate: 'now-14d',
        toDate: 'now-7d',
      });
      expect(args.stateManager.getState().query).toEqual({ query: 'new', language: 'lucene' });
    });

    it('passes the filters to the editor frame', () => {
      const indexPattern = ({ id: 'index1' } as unknown) as IIndexPattern;
      const field = ({ name: 'myfield' } as unknown) as IFieldType;
      const filters = [esFilters.buildExistsFilter(field, indexPattern)];
      const args = makeDefaultArgs({ filters });
      const instance = mount(<App {...args} />);
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

      expect(args.stateManager.getState().savedQuery).toEqual({
        id: '1',
        attributes: {
          title: '',
          description: '',
          query: { query: '', language: 'lucene' },
        },
      });
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

      expect(args.stateManager.getState().savedQuery).toEqual({
        id: '2',
        attributes: {
          title: 'new title',
          description: '',
          query: { query: '', language: 'lucene' },
        },
      });
    });

    it('clears all existing filters when the active saved query is cleared', () => {
      const indexPattern = ({ id: 'index1' } as unknown) as IIndexPattern;
      const field = ({ name: 'myfield' } as unknown) as IFieldType;
      const filters = [esFilters.buildExistsFilter(field, indexPattern)];
      const args = makeDefaultArgs({ filters });

      args.data.query.filterManager.setFilters(filters);

      const instance = mount(<App {...args} />);

      expect(args.stateManager.getState().filters.length).toBeGreaterThan(0);
      instance.find(TopNavMenu).prop('onClearSavedQuery')!();

      expect(args.data.query.filterManager.removeAll).toHaveBeenCalled();
      expect(args.stateManager.getState().filters).toEqual([]);
    });
  });
});
