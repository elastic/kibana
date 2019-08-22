/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { App } from './app';
import { Datasource, Visualization, SetState } from '../types';
import { Chrome } from 'ui/chrome';
import { toastNotifications } from 'ui/notify';
import { Storage } from 'ui/storage';
import { SavedObjectStore } from '../persistence';
import { mount } from 'enzyme';
import { QueryBar } from '../../../../../../src/legacy/core_plugins/data/public/query';
import { ExpressionRenderer } from 'src/legacy/core_plugins/data/public';
import { createMockDatasource, createMockVisualization } from '../mocks';

jest.mock('../../../../../../src/legacy/core_plugins/data/public/query', () => ({
  QueryBar: jest.fn(() => null),
}));

jest.mock('ui/new_platform');
jest.mock('ui/notify');
jest.mock('ui/chrome');
jest.mock('../persistence');

const waitForPromises = () => new Promise(resolve => setTimeout(resolve));

function makeDefaultArgs(): jest.Mocked<{
  chrome: Chrome;
  datasourceMap: Record<string, Datasource>;
  docId?: string;
  docStorage: SavedObjectStore;
  expressionRenderer: ExpressionRenderer;
  redirectTo: (id?: string) => void;
  store: Storage;
  visualizationMap: Record<string, Visualization>;
}> {
  const result: unknown = {
    chrome: {
      getUiSettingsClient() {
        return {
          get: jest.fn(type => {
            if (type === 'timepicker:timeDefaults') {
              return { from: 'now-7d', to: 'now' };
            } else if (type === 'search:queryLanguage') {
              return 'kuery';
            } else {
              return [];
            }
          }),
        };
      },
    },
    datasourceMap: {
      1: createMockDatasource(),
    },
    docStorage: {
      load: jest.fn(),
      save: jest.fn(),
    },
    expressionRenderer: jest.fn(),
    redirectTo: jest.fn(),
    store: { get: jest.fn() },
    visualizationMap: {
      vis: createMockVisualization(),
    },
  };

  return result as jest.Mocked<{
    chrome: Chrome;
    datasourceMap: Record<string, Datasource>;
    docId?: string;
    docStorage: SavedObjectStore;
    expressionRenderer: ExpressionRenderer;
    redirectTo: (id?: string) => void;
    store: Storage;
    visualizationMap: Record<string, Visualization>;
  }>;
}

async function mountInstance(args: ReturnType<typeof makeDefaultArgs>) {
  const instance = mount(<App {...args} />);

  await waitForPromises();
  instance.update();

  return instance;
}

function mockDoc() {
  return {
    id: '1234',
    title: 'shazam!',
    type: 'lens',
    visualizationType: 'vis',
    expression: '',
    state: {
      datasourceStates: { '1': undefined },
      datasourceMetaData: { filterableIndexPatterns: [] },
      visualization: { activeId: 'vis' },
      query: undefined,
      filters: [],
    },
  };
}

describe('Lens App', () => {
  it('renders the editor frame', async () => {
    const instance = await mountInstance(makeDefaultArgs());

    expect(instance.find('[data-test-subj="lnsEditorFrame"]').prop('state')).toBeDefined();
  });

  describe('persistence', () => {
    it('does not load a document if there is no document id', async () => {
      const args = makeDefaultArgs();

      await mountInstance(args);

      expect(args.docStorage.load).not.toHaveBeenCalled();
    });

    it('loads a document and uses query if there is a document id', async () => {
      const args = makeDefaultArgs();
      (args.docStorage.load as jest.Mock).mockResolvedValue({
        id: '1234',
        state: {
          query: 'fake query',
          datasourceMetaData: { filterableIndexPatterns: [{ id: '1', title: 'saved' }] },
          datasourceStates: { 1: { state: {} } },
        },
      });
      args.datasourceMap[1] = {
        ...createMockDatasource(),
        getMetaData: () => ({ filterableIndexPatterns: [{ id: '1', title: 'saved' }] }),
        getLayers: () => ['foo'],
      };

      const instance = await mountInstance(args);

      instance.setProps({ docId: '1234' });
      await waitForPromises();
      instance.update();

      expect(args.docStorage.load).toHaveBeenCalledWith('1234');
      expect(QueryBar).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRangeFrom: 'now-7d',
          dateRangeTo: 'now',
          query: 'fake query',
          indexPatterns: ['saved'],
        }),
        {}
      );

      const state = instance.find('[data-test-subj="lnsEditorFrame"]').prop('state');

      expect(state).toMatchObject({
        doc: {
          id: '1234',
          state: {
            query: 'fake query',
            datasourceMetaData: { filterableIndexPatterns: [{ id: '1', title: 'saved' }] },
          },
        },
      });
    });

    it('does not load documents on sequential renders unless the id changes', async () => {
      const args = makeDefaultArgs();
      (args.docStorage.load as jest.Mock).mockResolvedValue(mockDoc());

      const instance = await mountInstance(args);

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

      const instance = await mountInstance(args);

      instance.setProps({ docId: '1234' });
      await waitForPromises();

      expect(args.docStorage.load).toHaveBeenCalledWith('1234');
      expect(toastNotifications.addDanger).toHaveBeenCalled();
      expect(args.redirectTo).toHaveBeenCalled();
    });

    describe('save button', () => {
      it('allows save in the initial state', async () => {
        const instance = await mountInstance(makeDefaultArgs());

        expect(
          instance
            .find('[data-test-subj="lnsApp_saveButton"]')
            .first()
            .prop('disabled')
        ).toEqual(false);
      });

      it('saves the latest doc and then prevents more saving until an edit occurs', async () => {
        const args = makeDefaultArgs();
        (args.docStorage.save as jest.Mock).mockResolvedValue({ id: '1234' });
        (args.docStorage.load as jest.Mock).mockResolvedValue(mockDoc());

        const instance = await mountInstance(args);

        expect(
          instance
            .find('[data-test-subj="lnsApp_saveButton"]')
            .first()
            .prop('disabled')
        ).toEqual(false);

        instance
          .find('[data-test-subj="lnsApp_saveButton"]')
          .first()
          .prop('onClick')!({} as React.MouseEvent);

        expect(args.docStorage.save).toHaveBeenCalledWith(
          expect.objectContaining({ id: undefined })
        );

        await waitForPromises();

        expect(args.redirectTo).toHaveBeenCalledWith('1234');

        instance.setProps({ docId: '1234' });

        expect(args.docStorage.load).toHaveBeenCalled();

        await waitForPromises();
        instance.update();

        expect(
          instance
            .find('[data-test-subj="lnsApp_saveButton"]')
            .first()
            .prop('disabled')
        ).toEqual(true);

        const setState = instance
          .find('[data-test-subj="lnsEditorFrame"]')
          .prop('setState') as SetState;

        setState(state => ({ ...state, title: 'bazinga!' }));

        instance.update();

        expect(
          instance
            .find('[data-test-subj="lnsApp_saveButton"]')
            .first()
            .prop('disabled')
        ).toEqual(false);
      });

      it('handles save failure by showing a warning, but still allows another save', async () => {
        const args = makeDefaultArgs();
        (args.docStorage.save as jest.Mock).mockRejectedValue({ message: 'failed' });

        const instance = await mountInstance(args);

        instance
          .find('[data-test-subj="lnsApp_saveButton"]')
          .first()
          .prop('onClick')!({} as React.MouseEvent);

        await waitForPromises();

        expect(toastNotifications.addDanger).toHaveBeenCalled();
        expect(args.redirectTo).not.toHaveBeenCalled();
        await waitForPromises();

        expect(
          instance
            .find('[data-test-subj="lnsApp_saveButton"]')
            .first()
            .prop('disabled')
        ).toEqual(false);
      });
    });
  });

  describe('query bar state management', () => {
    it('uses the default time and query language settings', async () => {
      const instance = await mountInstance(makeDefaultArgs());

      expect(QueryBar).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRangeFrom: 'now-7d',
          dateRangeTo: 'now',
          query: { query: '', language: 'kuery' },
        }),
        {}
      );

      const state = instance.find('[data-test-subj="lnsEditorFrame"]').prop('state');

      expect(state).toMatchObject({
        dateRange: { fromDate: 'now-7d', toDate: 'now' },
        query: { query: '', language: 'kuery' },
      });
    });

    it('updates the editor frame when the user changes query or time', async () => {
      const instance = await mountInstance(makeDefaultArgs());

      instance
        .find('[data-test-subj="lnsApp_queryBar"]')
        .first()
        .prop('onSubmit')!(({
        dateRange: { from: 'now-14d', to: 'now-7d' },
        query: { query: 'new', language: 'lucene' },
      } as unknown) as React.FormEvent);

      instance.update();

      expect(QueryBar).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRangeFrom: 'now-14d',
          dateRangeTo: 'now-7d',
          query: { query: 'new', language: 'lucene' },
        }),
        {}
      );

      const state = instance.find('[data-test-subj="lnsEditorFrame"]').prop('state');

      expect(state).toMatchObject({
        dateRange: { fromDate: 'now-14d', toDate: 'now-7d' },
        query: { query: 'new', language: 'lucene' },
      });
    });
  });

  it('displays errors from the frame in a toast', async () => {
    const instance = await mountInstance(makeDefaultArgs());
    const onError = (instance
      .find('[data-test-subj="lnsEditorFrame"]')
      .prop('onError') as unknown) as (m: { message: string }) => {};

    onError({ message: 'error' });

    instance.update();

    expect(toastNotifications.addDanger).toHaveBeenCalled();
  });
});
