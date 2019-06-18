/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EditorFramePlugin } from './plugin';
import { createMockDependencies, MockedDependencies } from './mocks';

// import chrome from 'ui/chrome';
jest.mock('ui/chrome', () => ({
  getSavedObjectsClient: jest.fn(),
}));

// mock away actual data plugin to prevent all of it being loaded
jest.mock('../../../../../../src/legacy/core_plugins/data/public/setup', () => {});

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
      instance.mount(mountpoint);
      instance.unmount();
    }).not.toThrowError();
  });

  it('should not have child nodes after unmount', () => {
    const publicAPI = pluginInstance.setup(null, pluginDependencies);
    const instance = publicAPI.createInstance({});
    instance.mount(mountpoint);
    instance.unmount();

    expect(mountpoint.hasChildNodes()).toBe(false);
  });
});
