/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreSetup } from '@kbn/core/public';
import { coreMock, themeServiceMock } from '@kbn/core/public/mocks';

jest.mock('@kbn/react-kibana-mount', () => {
  const original = jest.requireActual('@kbn/react-kibana-mount');

  return {
    ...original,
    toMountPoint: (node: React.ReactNode) => node,
  };
});

import type { StartPlugins, PluginStart } from './types';
import { RuntimeFieldEditorFlyoutContent } from './components';
import { RuntimeFieldsPlugin } from './plugin';

const noop = () => {};

describe('RuntimeFieldsPlugin', () => {
  let coreSetup: CoreSetup<StartPlugins, PluginStart>;
  let plugin: RuntimeFieldsPlugin;

  beforeEach(() => {
    plugin = new RuntimeFieldsPlugin();
    coreSetup = coreMock.createSetup();
  });

  test('should return a handler to load the runtime field editor', async () => {
    const setupApi = plugin.setup(coreSetup, {});
    expect(setupApi.loadEditor).toBeDefined();
  });

  test('once it is loaded it should expose a handler to open the editor', async () => {
    const setupApi = plugin.setup(coreSetup, {});
    const response = await setupApi.loadEditor();
    expect(response.openEditor).toBeDefined();
  });

  test('should call core.overlays.openFlyout when opening the editor', async () => {
    const onSaveSpy = jest.fn();

    const coreStart = coreMock.createStart();
    const openFlyout = jest.spyOn(coreStart.overlays, 'openFlyout');

    // RuntimeFieldsPlugin expects theme in start services.
    coreStart.theme = themeServiceMock.createStartContract();

    const startPlugins = {} as StartPlugins;
    const pluginStart = {} as PluginStart;
    coreSetup.getStartServices = async () => [coreStart, startPlugins, pluginStart];
    const setupApi = plugin.setup(coreSetup, {});
    const { openEditor } = await setupApi.loadEditor();

    openEditor({ onSave: onSaveSpy });

    expect(openFlyout).toHaveBeenCalled();

    const [[mountPoint]] = openFlyout.mock.calls;
    const maybeElement: unknown = mountPoint;
    expect(React.isValidElement(maybeElement)).toBe(true);

    const provider = maybeElement as React.ReactElement<{ children?: unknown }>;

    // We force call the "onSave" prop from the <RuntimeFieldEditorFlyoutContent /> component
    // and make sure that the the spy is being called.
    // Note: we are testing implementation details, if we change or rename the "onSave" prop on
    // the component, we will need to update this test accordingly.
    expect(React.isValidElement(provider.props.children)).toBe(true);
    const flyout = provider.props.children as React.ReactElement<{ onSave?: () => void }>;

    expect(flyout.type).toBe(RuntimeFieldEditorFlyoutContent);
    expect(flyout.props.onSave).toBeDefined();
    flyout.props.onSave?.();
    expect(onSaveSpy).toHaveBeenCalled();
  });

  test('should return a handler to close the flyout', async () => {
    const setupApi = plugin.setup(coreSetup, {});
    const { openEditor } = await setupApi.loadEditor();

    const closeEditorHandler = openEditor({ onSave: noop });
    expect(typeof closeEditorHandler).toBe('function');
  });
});
