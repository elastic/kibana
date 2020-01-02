/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let toggleSetupMode;
let initSetupModeState;
let getSetupModeState;
let updateSetupModeData;
let setSetupModeMenuItem;

jest.mock('./ajax_error_handler', () => ({
  ajaxErrorHandlersProvider: err => {
    throw err;
  },
}));

jest.mock('react-dom', () => ({
  render: jest.fn(),
}));

let data = {};

const injectorModulesMock = {
  globalState: {
    save: jest.fn(),
  },
  Private: module => module,
  $http: {
    post: jest.fn().mockImplementation(() => {
      return { data };
    }),
  },
  $executor: {
    run: jest.fn(),
  },
};

const angularStateMock = {
  injector: {
    get: module => {
      return injectorModulesMock[module] || {};
    },
  },
  scope: {
    $apply: fn => fn && fn(),
    $evalAsync: fn => fn && fn(),
  },
};

// We are no longer waiting for setup mode data to be fetched when enabling
// so we need to wait for the next tick for the async action to finish
function waitForSetupModeData(action) {
  process.nextTick(action);
}

function setModules() {
  jest.resetModules();
  injectorModulesMock.globalState.inSetupMode = false;

  const setupMode = require('./setup_mode');
  toggleSetupMode = setupMode.toggleSetupMode;
  initSetupModeState = setupMode.initSetupModeState;
  getSetupModeState = setupMode.getSetupModeState;
  updateSetupModeData = setupMode.updateSetupModeData;
  setSetupModeMenuItem = setupMode.setSetupModeMenuItem;
}

describe('setup_mode', () => {
  beforeEach(async () => {
    jest.doMock('ui/new_platform', () => ({
      npSetup: {
        plugins: {
          cloud: {
            cloudId: undefined,
            isCloudEnabled: false,
          }
        }
      }
    }));
    setModules();
  });

  describe('setup', () => {
    it('should require angular state', async () => {
      let error;
      try {
        toggleSetupMode(true);
      } catch (err) {
        error = err;
      }
      expect(error).toEqual(
        'Unable to interact with setup ' +
          'mode because the angular injector was not previously set. This needs to be ' +
          'set by calling `initSetupModeState`.'
      );
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
      const render = require('react-dom').render;
      initSetupModeState(angularStateMock.scope, angularStateMock.injector);
      setSetupModeMenuItem();
      await toggleSetupMode(true);
      expect(render.mock.calls.length).toBe(2);
    });
  });

  describe('in setup mode', () => {
    afterEach(async () => {
      data = {};
    });

    it('should not fetch data if on cloud', async done => {
      const addDanger = jest.fn();
      jest.doMock('ui/new_platform', () => ({
        npSetup: {
          plugins: {
            cloud: {
              cloudId: 'test',
              isCloudEnabled: true,
            }
          }
        }
      }));
      data = {
        _meta: {
          hasPermissions: true,
        },
      };
      jest.doMock('ui/notify', () => ({
        toastNotifications: {
          addDanger,
        },
      }));
      setModules();
      initSetupModeState(angularStateMock.scope, angularStateMock.injector);
      await toggleSetupMode(true);
      waitForSetupModeData(() => {
        const state = getSetupModeState();
        expect(state.enabled).toBe(false);
        expect(addDanger).toHaveBeenCalledWith({
          title: 'Setup mode is not available',
          text: 'This feature is not available on cloud.',
        });
        done();
      });
    });

    it('should not fetch data if the user does not have sufficient permissions', async done => {
      const addDanger = jest.fn();
      jest.doMock('ui/notify', () => ({
        toastNotifications: {
          addDanger,
        },
      }));
      data = {
        _meta: {
          hasPermissions: false,
        },
      };
      setModules();
      initSetupModeState(angularStateMock.scope, angularStateMock.injector);
      await toggleSetupMode(true);
      waitForSetupModeData(() => {
        const state = getSetupModeState();
        expect(state.enabled).toBe(false);
        expect(addDanger).toHaveBeenCalledWith({
          title: 'Setup mode is not available',
          text: 'You do not have the necessary permissions to do this.',
        });
        done();
      });
    });

    it('should set the newly discovered cluster uuid', async done => {
      const clusterUuid = '1ajy';
      data = {
        _meta: {
          liveClusterUuid: clusterUuid,
          hasPermissions: true,
        },
        elasticsearch: {
          byUuid: {
            123: {
              isPartiallyMigrated: true,
            },
          },
        },
      };
      initSetupModeState(angularStateMock.scope, angularStateMock.injector);
      await toggleSetupMode(true);
      waitForSetupModeData(() => {
        expect(injectorModulesMock.globalState.cluster_uuid).toBe(clusterUuid);
        done();
      });
    });

    it('should fetch data for a given cluster', async done => {
      const clusterUuid = '1ajy';
      data = {
        _meta: {
          liveClusterUuid: clusterUuid,
          hasPermissions: true,
        },
        elasticsearch: {
          byUuid: {
            123: {
              isPartiallyMigrated: true,
            },
          },
        },
      };

      initSetupModeState(angularStateMock.scope, angularStateMock.injector);
      await toggleSetupMode(true);
      waitForSetupModeData(() => {
        expect(injectorModulesMock.$http.post).toHaveBeenCalledWith(
          `../api/monitoring/v1/setup/collection/cluster/${clusterUuid}`,
          { ccs: undefined }
        );
        done();
      });
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
