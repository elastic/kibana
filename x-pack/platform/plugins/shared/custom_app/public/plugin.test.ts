/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADD_PANEL_TRIGGER, ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { coreMock } from '@kbn/core/public/mocks';
import { CUSTOM_APP_EMBEDDABLE_TYPE } from '@kbn/custom-app-common';
import {
  ADD_CUSTOM_APP_ACTION_ID,
  CUSTOM_APP_APPLICATION_ID,
  OPEN_CUSTOM_APP_ACTION_ID,
  VIEW_CUSTOM_APP_SOURCE_ACTION_ID,
} from '../common/constants';
import { CustomAppPlugin } from './plugin';

jest.mock('./services', () => ({ setServices: jest.fn() }));

const setup = () => {
  const embeddable = {
    registerEmbeddablePublicDefinition: jest.fn(),
    registerAddFromLibraryType: jest.fn(),
  };
  const uiActions = { registerActionAsync: jest.fn(), attachAction: jest.fn() };
  const plugin = new CustomAppPlugin();
  const core = coreMock.createSetup();

  plugin.setup(core as never, { embeddable } as never);
  plugin.start({} as never, { data: { search: { search: jest.fn() } }, uiActions } as never);

  return { core, embeddable, uiActions };
};

describe('CustomAppPlugin', () => {
  it('registers the panel type', () => {
    const { embeddable } = setup();

    expect(embeddable.registerEmbeddablePublicDefinition).toHaveBeenCalledWith(
      CUSTOM_APP_EMBEDDABLE_TYPE,
      expect.any(Function)
    );
  });

  it('registers the standalone application, loaded only when it is opened', () => {
    const { core } = setup();

    expect(core.application.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: CUSTOM_APP_APPLICATION_ID,
        mount: expect.any(Function),
      })
    );
    expect(CUSTOM_APP_APPLICATION_ID).toBe('customApp');
  });

  describe('the library', () => {
    it('lists custom apps in "Add from library", under the saved object type of an app', () => {
      const { embeddable } = setup();

      expect(embeddable.registerAddFromLibraryType).toHaveBeenCalledWith(
        expect.objectContaining({
          savedObjectType: 'custom_app',
          savedObjectName: 'Custom app',
          onAdd: expect.any(Function),
        })
      );
    });

    it('adds the one that is chosen as a panel that links to it, and says so', async () => {
      const { embeddable } = setup();
      const [{ onAdd }] = embeddable.registerAddFromLibraryType.mock.calls[0];
      const container = { addNewPanel: jest.fn() };

      await onAdd(container, { id: 'saved-1' });

      expect(container.addNewPanel).toHaveBeenCalledWith(
        { panelType: CUSTOM_APP_EMBEDDABLE_TYPE, serializedState: { ref_id: 'saved-1' } },
        { displaySuccessMessage: true }
      );
    });
  });

  it('offers a custom app in the add panel menu', () => {
    const { uiActions } = setup();

    expect(uiActions.attachAction).toHaveBeenCalledWith(
      ADD_PANEL_TRIGGER,
      ADD_CUSTOM_APP_ACTION_ID
    );
  });

  it('puts View source on the menu of every panel, where it offers itself only to custom apps', () => {
    const { uiActions } = setup();

    expect(uiActions.attachAction).toHaveBeenCalledWith(
      ON_OPEN_PANEL_MENU,
      VIEW_CUSTOM_APP_SOURCE_ACTION_ID
    );
    expect(uiActions.registerActionAsync).toHaveBeenCalledWith(
      VIEW_CUSTOM_APP_SOURCE_ACTION_ID,
      expect.any(Function)
    );
  });

  it('puts Open app on the menu of every panel, where it offers itself only to panels that link to an app', () => {
    const { uiActions } = setup();

    expect(uiActions.attachAction).toHaveBeenCalledWith(
      ON_OPEN_PANEL_MENU,
      OPEN_CUSTOM_APP_ACTION_ID
    );
    expect(uiActions.registerActionAsync).toHaveBeenCalledWith(
      OPEN_CUSTOM_APP_ACTION_ID,
      expect.any(Function)
    );
  });

  it('loads the View source action only when it is first needed', async () => {
    const { uiActions } = setup();
    const [, load] = uiActions.registerActionAsync.mock.calls.find(
      ([id]) => id === VIEW_CUSTOM_APP_SOURCE_ACTION_ID
    )!;

    const action = await load();

    expect(action.id).toBe(VIEW_CUSTOM_APP_SOURCE_ACTION_ID);
  });
});
