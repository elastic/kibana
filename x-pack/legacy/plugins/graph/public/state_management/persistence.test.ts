/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockGraphStore, MockedGraphEnvironment } from './mocks';
import { loadSavedWorkspace, loadingSaga, saveWorkspace, savingSaga } from './persistence';
import { GraphWorkspaceSavedObject, UrlTemplate, AdvancedSettings, WorkspaceField } from '../types';
import { IndexpatternDatasource, datasourceSelector } from './datasource';
import { fieldsSelector } from './fields';
import { metaDataSelector, updateMetaData } from './meta_data';
import { templatesSelector } from './url_templates';
import { lookupIndexPattern, appStateToSavedWorkspace } from '../services/persistence';
import { settingsSelector } from './advanced_settings';
import { openSaveModal } from '../services/save_modal';

const waitForPromise = () => new Promise(r => setTimeout(r));

jest.mock('../services/persistence', () => ({
  lookupIndexPattern: jest.fn(() => ({ id: '123', attributes: { title: 'test-pattern' } })),
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

describe('persistence sagas', () => {
  let env: MockedGraphEnvironment;

  describe('loading saga', () => {
    beforeEach(() => {
      env = createMockGraphStore({ sagas: [loadingSaga] });
    });
    it('should deserialize saved object and populate state', async () => {
      env.store.dispatch(
        loadSavedWorkspace({ title: 'my workspace' } as GraphWorkspaceSavedObject)
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
      (lookupIndexPattern as jest.Mock).mockReturnValueOnce(undefined);
      env.store.dispatch(loadSavedWorkspace({} as GraphWorkspaceSavedObject));
      await waitForPromise();
      expect(env.mockedDeps.notifications.toasts.addDanger).toHaveBeenCalled();
      const resultingState = env.store.getState();
      expect(datasourceSelector(resultingState).current.type).toEqual('none');
    });
  });

  describe('saving saga', () => {
    beforeEach(() => {
      env = createMockGraphStore({
        sagas: [savingSaga],
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
      (env.mockedDeps.getSavedWorkspace().save as jest.Mock).mockResolvedValueOnce('123');
      env.mockedDeps.getSavedWorkspace().id = '123';
    });

    it('should serialize saved object and save after confirmation', async () => {
      env.store.dispatch(saveWorkspace());
      (openSaveModal as jest.Mock).mock.calls[0][0].saveWorkspace({}, true);
      expect(appStateToSavedWorkspace).toHaveBeenCalled();
      await waitForPromise();

      // three things are happening on saving: show toast, update state and update url
      expect(env.mockedDeps.notifications.toasts.addSuccess).toHaveBeenCalled();
      expect(metaDataSelector(env.store.getState()).savedObjectId).toEqual('123');
      expect(env.mockedDeps.changeUrl).toHaveBeenCalledWith(expect.stringContaining('123'));
    });

    it('should not save data if user does not give consent in the modal', async () => {
      env.store.dispatch(saveWorkspace());
      (openSaveModal as jest.Mock).mock.calls[0][0].saveWorkspace({}, false);
      // serialize function is called with `canSaveData` set to false
      expect(appStateToSavedWorkspace).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        false
      );
    });

    it('should not change url if it was just updating existing workspace', async () => {
      env.mockedDeps.getSavedWorkspace().id = '123';
      env.store.dispatch(updateMetaData({ savedObjectId: '123' }));
      env.store.dispatch(saveWorkspace());
      await waitForPromise();
      expect(env.mockedDeps.changeUrl).not.toHaveBeenCalled();
    });
  });
});
