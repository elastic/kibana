/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EditorFramePlugin, init, InitializedEditor } from './plugin';
import {
  createMockDependencies,
  MockedDependencies,
  createMockDatasource,
  createMockVisualization,
} from './mocks';
import { SavedObjectStore, Document } from '../persistence';
import { shallow, mount } from 'enzyme';

// import chrome from 'ui/chrome';
jest.mock('ui/chrome', () => ({
  getSavedObjectsClient: jest.fn(),
}));

// mock away actual data plugin to prevent all of it being loaded
jest.mock('../../../../../../src/legacy/core_plugins/data/public/setup', () => {});

function mockStore(): SavedObjectStore {
  return {
    load: jest.fn(),
    save: jest.fn(),
  };
}

describe('editor_frame plugin', () => {
  let pluginInstance: EditorFramePlugin;
  let mountpoint: Element;
  let pluginDependencies: MockedDependencies;

  beforeEach(() => {
    pluginInstance = new EditorFramePlugin();
    mountpoint = document.createElement('div');
    pluginDependencies = createMockDependencies();
  });

  afterEach(() => {
    mountpoint.remove();
  });

  it('should create an editor frame instance which mounts and unmounts', () => {
    expect(() => {
      const publicAPI = pluginInstance.setup(null, pluginDependencies);
      const instance = publicAPI.createInstance({});
      instance.mount(mountpoint, { onError: jest.fn() });
      instance.unmount();
    }).not.toThrowError();
  });

  it('should not have child nodes after unmount', () => {
    const publicAPI = pluginInstance.setup(null, pluginDependencies);
    const instance = publicAPI.createInstance({});
    instance.mount(mountpoint, { onError: jest.fn() });
    instance.unmount();

    expect(mountpoint.hasChildNodes()).toBe(false);
  });

  describe('init', () => {
    it('should do nothing if the persistedId is undefined', async () => {
      const store = mockStore();
      expect(
        await init({
          store,
          onError: jest.fn(),
        })
      ).toEqual({});
      expect(store.load).not.toHaveBeenCalled();
    });

    it('should load the document, if persistedId is defined', async () => {
      const doc: Document = {
        datasourceType: 'indexpattern',
        id: 'hoi',
        state: { datasource: 'foo', visualization: 'bar' },
        title: 'shazm',
        visualizationType: 'fanci',
        type: 'lens',
      };

      const store = {
        ...mockStore(),
        load: jest.fn(async () => doc),
      };

      expect(
        await init({
          persistedId: 'hoi',
          store,
          onError: jest.fn(),
        })
      ).toEqual({ doc });

      expect(store.load).toHaveBeenCalledWith('hoi');
    });

    it('should call onError if an error occurs while loading', async () => {
      const error = new Error('dang!');
      const store = {
        ...mockStore(),
        load: jest.fn(async () => {
          throw error;
        }),
      };
      const onError = jest.fn();

      expect(
        await init({
          persistedId: 'hoi',
          store,
          onError,
        })
      ).toEqual({ error });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should not call onError if a 404 error occurs while loading', async () => {
      const error = new Object({ statusCode: 404 });
      const store = {
        ...mockStore(),
        load: jest.fn(async () => {
          throw error;
        }),
      };
      const onError = jest.fn();

      expect(
        await init({
          persistedId: 'hoi',
          store,
          onError,
        })
      ).toEqual({ error });

      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('render', () => {
    it('renders 404 if given a 404 error', () => {
      const error = { statusCode: 404, message: 'Ruh roh!' };
      const result = shallow(
        <InitializedEditor
          datasources={{}}
          visualizations={{}}
          error={error}
          expressionRenderer={() => <div />}
          routeProps={{ history: { push: jest.fn() } }}
          store={mockStore()}
          onError={jest.fn()}
        />
      );
      expect(result).toMatchInlineSnapshot(`<NotFound />`);
    });

    it('redirects via route history', () => {
      const historyPush = jest.fn();
      const component = mount(
        <InitializedEditor
          datasources={{}}
          visualizations={{}}
          expressionRenderer={() => <div />}
          routeProps={{ history: { push: historyPush } }}
          store={mockStore()}
          onError={jest.fn()}
        />
      );

      const redirectTo = component.find('[data-test-subj="lnsEditorFrame"]').prop('redirectTo') as (
        path: string
      ) => void;
      redirectTo('mehnewurl');
      expect(historyPush).toHaveBeenCalledWith('mehnewurl');
    });

    it('uses the document datasource and visualization types, if available', () => {
      const component = mount(
        <InitializedEditor
          doc={{
            datasourceType: 'b',
            visualizationType: 'd',
            state: { visualization: 'viz', datasource: 'data' },
            title: 'ttt',
          }}
          datasources={{ a: createMockDatasource(), b: createMockDatasource() }}
          visualizations={{ c: createMockVisualization(), d: createMockVisualization() }}
          expressionRenderer={() => <div />}
          routeProps={{ history: { push: jest.fn() } }}
          store={mockStore()}
          onError={jest.fn()}
        />
      );

      const frame = component.find('[data-test-subj="lnsEditorFrame"]');

      expect(frame.prop('initialDatasourceId')).toEqual('b');
      expect(frame.prop('initialVisualizationId')).toEqual('d');
    });

    it('uses the first datasource and visualization type, if there is no document', () => {
      const component = mount(
        <InitializedEditor
          datasources={{ a: createMockDatasource(), b: createMockDatasource() }}
          visualizations={{ c: createMockVisualization(), d: createMockVisualization() }}
          expressionRenderer={() => <div />}
          routeProps={{ history: { push: jest.fn() } }}
          store={mockStore()}
          onError={jest.fn()}
        />
      );

      const frame = component.find('[data-test-subj="lnsEditorFrame"]');

      expect(frame.prop('initialDatasourceId')).toEqual('a');
      expect(frame.prop('initialVisualizationId')).toEqual('c');
    });
  });
});
