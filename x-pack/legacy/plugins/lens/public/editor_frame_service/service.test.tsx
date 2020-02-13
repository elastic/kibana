/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EditorFrameService } from './service';
import { coreMock } from 'src/core/public/mocks';
import {
  MockedSetupDependencies,
  MockedStartDependencies,
  createMockSetupDependencies,
  createMockStartDependencies,
} from './mocks';

jest.mock('ui/new_platform');

// mock away actual dependencies to prevent all of it being loaded
jest.mock('../../../../../../src/legacy/core_plugins/interpreter/public/registries', () => {});
jest.mock('../../../../../../src/legacy/core_plugins/data/public/legacy', () => ({
  start: {},
  setup: {},
}));
jest.mock('./embeddable/embeddable_factory', () => ({
  EmbeddableFactory: class Mock {},
}));

describe('editor_frame service', () => {
  let pluginInstance: EditorFrameService;
  let mountpoint: Element;
  let pluginSetupDependencies: MockedSetupDependencies;
  let pluginStartDependencies: MockedStartDependencies;

  beforeEach(() => {
    pluginInstance = new EditorFrameService();
    mountpoint = document.createElement('div');
    pluginSetupDependencies = createMockSetupDependencies();
    pluginStartDependencies = createMockStartDependencies();
  });

  afterEach(() => {
    mountpoint.remove();
  });

  it('should create an editor frame instance which mounts and unmounts', async () => {
    await expect(
      (async () => {
        pluginInstance.setup(coreMock.createSetup(), pluginSetupDependencies);
        const publicAPI = pluginInstance.start(coreMock.createStart(), pluginStartDependencies);
        const instance = await publicAPI.createInstance({});
        instance.mount(mountpoint, {
          onError: jest.fn(),
          onChange: jest.fn(),
          dateRange: { fromDate: '', toDate: '' },
          query: { query: '', language: 'lucene' },
          filters: [],
        });
        instance.unmount();
      })()
    ).resolves.toBeUndefined();
  });

  it('should not have child nodes after unmount', async () => {
    pluginInstance.setup(coreMock.createSetup(), pluginSetupDependencies);
    const publicAPI = pluginInstance.start(coreMock.createStart(), pluginStartDependencies);
    const instance = await publicAPI.createInstance({});
    instance.mount(mountpoint, {
      onError: jest.fn(),
      onChange: jest.fn(),
      dateRange: { fromDate: '', toDate: '' },
      query: { query: '', language: 'lucene' },
      filters: [],
    });
    instance.unmount();

    expect(mountpoint.hasChildNodes()).toBe(false);
  });
});
