/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedGraphEnvironment } from './mocks';
import { createMockGraphStore } from './mocks';
import type { LoadSavedWorkspacePayload } from './persistence';
import { loadSavedWorkspace, registerPersistenceListeners, saveWorkspace } from './persistence';
import type {
  UrlTemplate,
  AdvancedSettings,
  WorkspaceField,
  GraphWorkspaceSavedObject,
} from '../types';
import type { IndexpatternDatasource } from './datasource';
import { datasourceSelector } from './datasource';
import { fieldsSelector } from './fields';
import { metaDataSelector, updateMetaData } from './meta_data';
import { templatesSelector } from './url_templates';
import {
  migrateLegacyIndexPatternRef,
  appStateToSavedWorkspace,
  lookupIndexPatternId,
} from '../services/persistence';
import { settingsSelector } from './advanced_settings';
import { openSaveModal } from '../services/save_modal';
import { saveSavedWorkspace } from '../helpers/saved_workspace_utils';

const waitForPromise = () => new Promise((r) => setTimeout(r));
// mocking random id generator function
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    htmlIdGenerator: (fn: unknown) => {
      let counter = 0;
      return () => counter++;
    },
  };
});

jest.mock('../services/persistence', () => ({
  lookupIndexPatternId: jest.fn(() => ({ id: '123', attributes: { title: 'test-pattern' } })),
  migrateLegacyIndexPatternRef: jest.fn(() => ({ success: true })),
  savedWorkspaceToAppState: jest.fn(() => ({
    urlTemplates: [
      {
        description: 'template',
        url: 'http://example.org/q={{gquery}}',
      },
    ] as UrlTemplate[],
    advancedSettings: { minDocCount: 12 } as AdvancedSettings,
    allFields: [
      {
        name: 'testfield',
      },
    ] as WorkspaceField[],
  })),
  appStateToSavedWorkspace: jest.fn(),
}));

jest.mock('../services/save_modal', () => ({
  openSaveModal: jest.fn(),
}));

jest.mock('../helpers/saved_workspace_utils', () => ({
  saveSavedWorkspace: jest.fn(),
}));

describe('persistence listeners', () => {
  let env: MockedGraphEnvironment;

  describe('loading listener', () => {
    beforeEach(() => {
      env = createMockGraphStore({ listeners: [registerPersistenceListeners] });
    });
    it('should deserialize saved object and populate state', async () => {
      env.store.dispatch(
        loadSavedWorkspace({
          savedWorkspace: { title: 'my workspace' },
        } as LoadSavedWorkspacePayload)
      );
      await waitForPromise();
      const resultingState = env.store.getState();
      expect(settingsSelector(resultingState).minDocCount).toEqual(12);
      expect((datasourceSelector(resultingState).current as IndexpatternDatasource).title).toEqual(
        'test-pattern'
      );
      expect(fieldsSelector(resultingState)[0].name).toEqual('testfield');
      expect(metaDataSelector(resultingState).title).toEqual('my workspace');
      expect(templatesSelector(resultingState)[0].url).toEqual('http://example.org/q={{gquery}}');
    });

    it('should warn with a toast and abort if index pattern is not found', async () => {
      (migrateLegacyIndexPatternRef as jest.Mock).mockReturnValueOnce({ success: false });
      env.store.dispatch(loadSavedWorkspace({ savedWorkspace: {} } as LoadSavedWorkspacePayload));
      await waitForPromise();
      expect(env.mockedDeps.notifications.toasts.addDanger).toHaveBeenCalled();
      const resultingState = env.store.getState();
      expect(datasourceSelector(resultingState).current.type).toEqual('none');
    });

    it('should not crash if the data view goes missing', async () => {
      (lookupIndexPatternId as jest.Mock).mockReturnValueOnce('missing-dataview');
      env.store.dispatch(
        loadSavedWorkspace({
          savedWorkspace: {
            title: 'my workspace',
          },
        } as LoadSavedWorkspacePayload)
      );
      await waitForPromise();
      expect(env.mockedDeps.notifications.toasts.addDanger).toHaveBeenCalledWith(
        'Data view "missing-dataview" not found'
      );
    });
  });

  describe('saving listener', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (saveSavedWorkspace as jest.Mock).mockResolvedValue('123');
      env = createMockGraphStore({
        listeners: [registerPersistenceListeners],
        initialStateOverwrites: {
          datasource: {
            current: {
              type: 'indexpattern',
              id: '78698689',
              title: 'test-pattern',
            },
            loading: false,
          },
        },
        mockedDepsOverwrites: {
          savePolicy: 'configAndDataWithConsent',
        },
      });
    });

    it('should serialize saved object and save after confirmation', async () => {
      env.store.dispatch(saveWorkspace({ id: '123' } as GraphWorkspaceSavedObject));
      (openSaveModal as jest.Mock).mock.calls[0][0].saveWorkspace({}, true);
      expect(appStateToSavedWorkspace).toHaveBeenCalled();
      await waitForPromise();

      // three things are happening on saving: show toast, update state and update url
      expect(env.mockedDeps.notifications.toasts.addSuccess).toHaveBeenCalled();
      expect(metaDataSelector(env.store.getState()).savedObjectId).toEqual('123');
      expect(env.mockedDeps.changeUrl).toHaveBeenCalledWith(expect.stringContaining('123'));
    });

    it('should not save data if user does not give consent in the modal', async () => {
      env.store.dispatch(saveWorkspace({} as GraphWorkspaceSavedObject));
      (openSaveModal as jest.Mock).mock.calls[0][0].saveWorkspace({}, false);
      // serialize function is called with `canSaveData` set to false
      expect(appStateToSavedWorkspace).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        false
      );
    });

    it('should not change url if it was just updating existing workspace', async () => {
      env.store.dispatch(updateMetaData({ savedObjectId: '123' }));
      env.store.dispatch(saveWorkspace({} as GraphWorkspaceSavedObject));
      await waitForPromise();
      expect(env.mockedDeps.changeUrl).not.toHaveBeenCalled();
    });

    it('completes without updating metadata when the modal is closed', async () => {
      env.store.dispatch(saveWorkspace({} as GraphWorkspaceSavedObject));

      (openSaveModal as jest.Mock).mock.calls[0][0].onClose();
      await waitForPromise();

      expect(saveSavedWorkspace).not.toHaveBeenCalled();
      expect(metaDataSelector(env.store.getState()).savedObjectId).toBeUndefined();
    });

    it('completes without updating metadata when saving fails', async () => {
      (saveSavedWorkspace as jest.Mock).mockRejectedValueOnce(new Error('save failed'));
      env.store.dispatch(saveWorkspace({} as GraphWorkspaceSavedObject));

      await (openSaveModal as jest.Mock).mock.calls[0][0].saveWorkspace({}, true);
      await waitForPromise();

      expect(env.mockedDeps.notifications.toasts.addDanger).toHaveBeenCalled();
      expect(metaDataSelector(env.store.getState()).savedObjectId).toBeUndefined();
    });

    it('only applies the latest repeated save result', async () => {
      let resolveFirstSave: (id: string) => void = () => {};
      const firstSave = new Promise<string>((resolve) => {
        resolveFirstSave = resolve;
      });
      (saveSavedWorkspace as jest.Mock)
        .mockReturnValueOnce(firstSave)
        .mockResolvedValueOnce('second-id');

      env.store.dispatch(saveWorkspace({ id: 'first-id' } as GraphWorkspaceSavedObject));
      const firstModal = (openSaveModal as jest.Mock).mock.calls[0][0];
      const firstSaveResult = firstModal.saveWorkspace({}, true);

      env.store.dispatch(saveWorkspace({ id: 'second-id' } as GraphWorkspaceSavedObject));
      const secondModal = (openSaveModal as jest.Mock).mock.calls[1][0];
      await secondModal.saveWorkspace({}, true);
      await waitForPromise();

      resolveFirstSave('first-id');
      await firstSaveResult;
      await waitForPromise();

      expect(metaDataSelector(env.store.getState()).savedObjectId).toBe('second-id');
    });
  });
});
