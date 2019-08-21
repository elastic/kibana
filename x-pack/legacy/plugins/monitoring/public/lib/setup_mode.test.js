/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toggleSetupMode, initSetupModeState, getSetupModeState, updateSetupModeData } from './setup_mode';

jest.mock('./ajax_error_handler', () => ({
  ajaxErrorHandlersProvider: err => {
    throw err;
  }
}));

let data = {};

const injectorModulesMock = {
  globalState: {
    save: jest.fn()
  },
  Private: module => module,
  $http: {
    post: jest.fn().mockImplementation(() => {
      return { data };
    })
  },
  $executor: {
    run: jest.fn()
  }
};

const angularStateMock = {
  injector: {
    get: module => {
      return injectorModulesMock[module] || {};
    }
  },
  scope: {
    $apply: fn => fn && fn()
  }
};

describe('setup_mode', () => {
  describe('setup', () => {
    afterEach(async () => {
      toggleSetupMode(false);
    });

    it('should require angular state', async () => {
      expect(toggleSetupMode(true)).rejects.toEqual('Unable to interact with setup '
      + 'mode because the angular injector was not previously set. This needs to be '
      + 'set by calling `initSetupModeState`.');
    });

    it('should enable toggle mode', async () => {
      initSetupModeState(angularStateMock.scope, angularStateMock.injector);
      await toggleSetupMode(true);
      expect(injectorModulesMock.globalState.inSetupMode).toBe(true);
    });

    it('should disable toggle mode', async () => {
      initSetupModeState(angularStateMock.scope, angularStateMock.injector);
      await toggleSetupMode(false);
      expect(injectorModulesMock.globalState.inSetupMode).toBe(false);
    });

    it('should set top nav config', async () => {
      initSetupModeState(angularStateMock.scope, angularStateMock.injector);
      expect(angularStateMock.scope.topNavMenu.length).toBe(1);
      await toggleSetupMode(true);
      expect(angularStateMock.scope.topNavMenu.length).toBe(2);
    });
  });

  describe('in setup mode', () => {
    afterEach(async () => {
      data = {};
      toggleSetupMode(false);
    });

    it('should enable it through clicking top nav item', async () => {
      initSetupModeState(angularStateMock.scope, angularStateMock.injector);
      await angularStateMock.scope.topNavMenu[0].run();
      expect(injectorModulesMock.globalState.inSetupMode).toBe(true);
    });

    it('should not fetch data if on cloud', async () => {
      data = {
        _meta: {
          isOnCloud: true
        }
      };
      initSetupModeState(angularStateMock.scope, angularStateMock.injector);
      await toggleSetupMode(true);
      const state = getSetupModeState();
      expect(state.enabled).toBe(false);
    });

    it('should set the newly discovered cluster uuid', async () => {
      const clusterUuid = '1ajy';
      data = {
        _meta: {
          liveClusterUuid: clusterUuid
        },
        elasticsearch: {
          byUuid: {
            123: {
              isPartiallyMigrated: true
            }
          }
        }
      };
      initSetupModeState(angularStateMock.scope, angularStateMock.injector);
      await toggleSetupMode(true);
      expect(injectorModulesMock.globalState.cluster_uuid).toBe(clusterUuid);
    });

    it('should fetch data for a given cluster', async () => {
      const clusterUuid = '1ajy';
      data = {
        _meta: {
          liveClusterUuid: clusterUuid
        },
        elasticsearch: {
          byUuid: {
            123: {
              isPartiallyMigrated: true
            }
          }
        }
      };

      initSetupModeState(angularStateMock.scope, angularStateMock.injector);
      await toggleSetupMode(true);
      expect(injectorModulesMock.$http.post).toHaveBeenCalledWith(
        `../api/monitoring/v1/setup/collection/cluster/${clusterUuid}`,
        { ccs: undefined }
      );
    });

    it('should fetch data for a single node', async () => {
      initSetupModeState(angularStateMock.scope, angularStateMock.injector);
      await toggleSetupMode(true);
      injectorModulesMock.$http.post.mockClear();
      await updateSetupModeData('45asd');
      expect(injectorModulesMock.$http.post).toHaveBeenCalledWith(
        '../api/monitoring/v1/setup/collection/node/45asd',
        { ccs: undefined }
      );
    });

    it('should fetch data without a cluster uuid', async () => {
      initSetupModeState(angularStateMock.scope, angularStateMock.injector);
      await toggleSetupMode(true);
      injectorModulesMock.$http.post.mockClear();
      await updateSetupModeData(undefined, true);
      expect(injectorModulesMock.$http.post).toHaveBeenCalledWith(
        '../api/monitoring/v1/setup/collection/cluster',
        { ccs: undefined }
      );
    });
  });
});
