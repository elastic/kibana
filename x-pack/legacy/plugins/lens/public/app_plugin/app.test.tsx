/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { App } from './app';
import { EditorFrameInstance } from '../types';
import { Storage } from 'ui/storage';
import { Document, SavedObjectStore } from '../persistence';
import { mount } from 'enzyme';
import { QueryBarTopRow } from '../../../../../../src/legacy/core_plugins/data/public/query/query_bar';
import { SavedObjectsClientContract } from 'src/core/public';
import { coreMock } from 'src/core/public/mocks';

jest.mock('../../../../../../src/legacy/core_plugins/data/public/query/query_bar', () => ({
  QueryBarTopRow: jest.fn(() => null),
}));

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

describe('Lens App', () => {
  let frame: jest.Mocked<EditorFrameInstance>;
  let core: ReturnType<typeof coreMock['createStart']>;

  function makeDefaultArgs(): jest.Mocked<{
    editorFrame: EditorFrameInstance;
    core: typeof core;
    store: Storage;
    docId?: string;
    docStorage: SavedObjectStore;
    redirectTo: (id?: string) => void;
    savedObjectsClient: SavedObjectsClientContract;
  }> {
    return ({
      editorFrame: createMockFrame(),
      core,
      store: {
        get: jest.fn(),
      },
      docStorage: {
        load: jest.fn(),
        save: jest.fn(),
      },
      QueryBarTopRow: jest.fn(() => <div />),
      redirectTo: jest.fn(id => {}),
      savedObjectsClient: jest.fn(),
    } as unknown) as jest.Mocked<{
      editorFrame: EditorFrameInstance;
      core: typeof core;
      store: Storage;
      docId?: string;
      docStorage: SavedObjectStore;
      redirectTo: (id?: string) => void;
      savedObjectsClient: SavedObjectsClientContract;
    }>;
  }

  beforeEach(() => {
    frame = createMockFrame();
    core = coreMock.createStart();

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

    (core.http.basePath.get as jest.Mock).mockReturnValue(`/testbasepath`);
    (core.http.basePath.prepend as jest.Mock).mockImplementation(s => `/testbasepath${s}`);
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
            "onChange": [Function],
            "onError": [Function],
            "query": Object {
              "language": "kuery",
              "query": "",
            },
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
      expect(QueryBarTopRow).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRangeFrom: 'now-7d',
          dateRangeTo: 'now',
          query: 'fake query',
          indexPatterns: ['saved'],
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
      it('shows a save button that is enabled when the frame has provided its state', () => {
        const args = makeDefaultArgs();
        args.editorFrame = frame;

        const instance = mount(<App {...args} />);

        expect(
          instance
            .find('[data-test-subj="lnsApp_saveButton"]')
            .first()
            .prop('disabled')
        ).toEqual(true);

        const onChange = frame.mount.mock.calls[0][1].onChange;
        onChange({ indexPatternTitles: [], doc: ('will save this' as unknown) as Document });

        instance.update();

        expect(
          instance
            .find('[data-test-subj="lnsApp_saveButton"]')
            .first()
            .prop('disabled')
        ).toEqual(false);
      });

      it('saves the latest doc and then prevents more saving', async () => {
        const args = makeDefaultArgs();
        args.editorFrame = frame;
        (args.docStorage.save as jest.Mock).mockResolvedValue({ id: '1234' });

        const instance = mount(<App {...args} />);

        expect(frame.mount).toHaveBeenCalledTimes(1);

        const onChange = frame.mount.mock.calls[0][1].onChange;
        onChange({ indexPatternTitles: [], doc: ({ id: undefined } as unknown) as Document });

        instance.update();

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

        expect(args.docStorage.save).toHaveBeenCalledWith({ id: undefined });

        await waitForPromises();

        expect(args.redirectTo).toHaveBeenCalledWith('1234');

        instance.setProps({ docId: '1234' });

        expect(args.docStorage.load).not.toHaveBeenCalled();

        expect(
          instance
            .find('[data-test-subj="lnsApp_saveButton"]')
            .first()
            .prop('disabled')
        ).toEqual(true);
      });

      it('handles save failure by showing a warning, but still allows another save', async () => {
        const args = makeDefaultArgs();
        args.editorFrame = frame;
        (args.docStorage.save as jest.Mock).mockRejectedValue({ message: 'failed' });

        const instance = mount(<App {...args} />);

        const onChange = frame.mount.mock.calls[0][1].onChange;
        onChange({ indexPatternTitles: [], doc: ({ id: undefined } as unknown) as Document });

        instance.update();

        instance
          .find('[data-test-subj="lnsApp_saveButton"]')
          .first()
          .prop('onClick')!({} as React.MouseEvent);

        await waitForPromises();

        expect(args.core.notifications.toasts.addDanger).toHaveBeenCalled();
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
    it('uses the default time and query language settings', () => {
      const args = makeDefaultArgs();
      args.editorFrame = frame;

      mount(<App {...args} />);

      expect(QueryBarTopRow).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRangeFrom: 'now-7d',
          dateRangeTo: 'now',
          query: { query: '', language: 'kuery' },
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

    it('updates the index patterns when the editor frame is changed', () => {
      const args = makeDefaultArgs();
      args.editorFrame = frame;

      const instance = mount(<App {...args} />);

      expect(QueryBarTopRow).toHaveBeenCalledWith(
        expect.objectContaining({
          indexPatterns: [],
        }),
        {}
      );

      const onChange = frame.mount.mock.calls[0][1].onChange;
      onChange({
        indexPatternTitles: ['newIndex'],
        doc: ({ id: undefined } as unknown) as Document,
      });

      instance.update();

      expect(QueryBarTopRow).toHaveBeenCalledWith(
        expect.objectContaining({
          indexPatterns: ['newIndex'],
        }),
        {}
      );
    });

    it('updates the editor frame when the user changes query or time', () => {
      const args = makeDefaultArgs();
      args.editorFrame = frame;

      const instance = mount(<App {...args} />);

      instance
        .find('[data-test-subj="lnsApp_queryBar"]')
        .first()
        .prop('onSubmit')!(({
        dateRange: { from: 'now-14d', to: 'now-7d' },
        query: { query: 'new', language: 'lucene' },
      } as unknown) as React.FormEvent);

      instance.update();

      expect(QueryBarTopRow).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRangeFrom: 'now-14d',
          dateRangeTo: 'now-7d',
          query: { query: 'new', language: 'lucene' },
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
