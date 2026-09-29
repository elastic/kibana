/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

let toggleSetupMode;
let initSetupModeState;
let getSetupModeState;
let updateSetupModeData;

const handleErrorsMock = vi.fn();
const callbackMock = vi.fn();

vi.mock('../legacy_shims', () => {
  return {
    Legacy: {
      shims: {
        toastNotifications: {
          addDanger: vi.fn(),
        },
        I18nContext: '<div>',
      },
    },
  };
});

function setModulesAndMocks() {
  vi.clearAllMocks().resetModules();

  const setupMode = require('./setup_mode');
  toggleSetupMode = setupMode.toggleSetupMode;
  initSetupModeState = setupMode.initSetupModeState;
  getSetupModeState = setupMode.getSetupModeState;
  updateSetupModeData = setupMode.updateSetupModeData;
}

function waitForSetupModeData() {
  return new Promise((resolve) => process.nextTick(resolve));
}

describe('setup_mode', () => {
  beforeEach(async () => {
    setModulesAndMocks();
  });

  describe('setup', () => {
    it('should enable toggle mode', async () => {
      const globalState = {
        inSetupMode: false,
        save: vi.fn(),
      };
      const httpServiceMock = {
        post: vi.fn(),
      };

      await initSetupModeState(globalState, httpServiceMock, handleErrorsMock, callbackMock);
      toggleSetupMode(true);
      expect(globalState.inSetupMode).toBe(true);
    });

    it('should disable toggle mode', async () => {
      const globalState = {
        inSetupMode: true,
        save: vi.fn(),
      };
      const httpServiceMock = {
        post: vi.fn(),
      };
      const handleErrorsMock = vi.fn();
      const callbackMock = vi.fn();
      await initSetupModeState(globalState, httpServiceMock, handleErrorsMock, callbackMock);
      toggleSetupMode(false);
      expect(globalState.inSetupMode).toBe(false);
    });
  });

  describe('in setup mode', () => {
    it('should not fetch data if the user does not have sufficient permissions', async () => {
      const globalState = {
        inSetupMode: false,
        save: vi.fn(),
      };
      const httpServiceMock = {
        post: vi.fn().mockReturnValue(
          Promise.resolve({
            _meta: {
              hasPermissions: false,
            },
          })
        ),
      };

      const addDanger = vi.fn();
      vi.doMock('../legacy_shims', () => {
            const mocked = {
                  Legacy: {
                    shims: {
                      toastNotifications: {
                        addDanger,
                      },
                      I18nContext: '<div>',
                    },
                  },
                };
            return { ...mocked, default: mocked };
          });

      setModulesAndMocks();
      await initSetupModeState(globalState, httpServiceMock, handleErrorsMock, callbackMock);
      toggleSetupMode(true);
      await waitForSetupModeData();

      const state = getSetupModeState();
      expect(state.enabled).toBe(false);
      expect(addDanger).toHaveBeenCalledWith({
        title: 'Setup mode is not available',
        text: 'You do not have the necessary permissions to do this.',
      });
    });

    it('should set the newly discovered cluster uuid', async () => {
      const globalState = {
        inSetupMode: false,
        cluster_uuid: undefined,
        save: vi.fn(),
      };
      const clusterUuid = '1ajy';
      const httpServiceMock = {
        post: vi.fn().mockReturnValue(
          Promise.resolve({
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
          })
        ),
      };

      await initSetupModeState(globalState, httpServiceMock, handleErrorsMock, callbackMock);
      toggleSetupMode(true);
      await waitForSetupModeData();

      expect(globalState.cluster_uuid).toBe(clusterUuid);
    });

    it('should fetch data for a given cluster', async () => {
      const clusterUuid = '1ajy';
      const globalState = {
        inSetupMode: false,
        cluster_uuid: clusterUuid,
        save: vi.fn(),
      };
      const httpServiceMock = {
        post: vi.fn().mockReturnValue(
          Promise.resolve({
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
          })
        ),
      };

      await initSetupModeState(globalState, httpServiceMock, handleErrorsMock, callbackMock);
      toggleSetupMode(true);
      await waitForSetupModeData();

      expect(httpServiceMock.post).toHaveBeenCalledWith(
        `../api/monitoring/v1/setup/collection/cluster/${clusterUuid}`,
        { body: '{}' }
      );
    });

    it('should fetch data for a single node', async () => {
      const clusterUuid = '1ajy';
      const globalState = {
        inSetupMode: false,
        save: vi.fn(),
      };
      const httpServiceMock = {
        post: vi.fn().mockReturnValue(
          Promise.resolve({
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
          })
        ),
      };

      await initSetupModeState(globalState, httpServiceMock, handleErrorsMock, callbackMock);
      toggleSetupMode(true);
      await waitForSetupModeData();

      await updateSetupModeData('45asd');
      expect(httpServiceMock.post).toHaveBeenCalledWith(
        '../api/monitoring/v1/setup/collection/node/45asd',
        { body: '{}' }
      );
    });

    it('should fetch data without a cluster uuid', async () => {
      const globalState = {
        inSetupMode: false,
        save: vi.fn(),
      };
      const httpServiceMock = {
        post: vi.fn(),
      };

      await initSetupModeState(globalState, httpServiceMock, handleErrorsMock, callbackMock);
      await toggleSetupMode(true);
      await updateSetupModeData(undefined, true);
      const url = '../api/monitoring/v1/setup/collection/cluster';
      const args = { body: '{}' };
      expect(httpServiceMock.post).toHaveBeenCalledWith(url, args);
    });
  });
});
