/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import { getLicenseExpiration } from './license_expiration';
import {
  ALERT_TYPE_LICENSE_EXPIRATION,
  MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS,
} from '../../common/constants';
import { Logger } from 'src/core/server';
import { AlertServices, AlertInstance } from '../../../../../plugins/alerting/server';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import {
  AlertState,
  AlertClusterState,
  AlertParams,
  LicenseExpirationAlertExecutorOptions,
} from './types';
import { SavedObject, SavedObjectAttributes } from 'src/core/server';
import { SavedObjectsClientContract } from 'src/core/server';

function fillLicense(license: any, clusterUuid?: string) {
  return {
    hits: {
      hits: [
        {
          _source: {
            license,
            cluster_uuid: clusterUuid,
          },
        },
      ],
    },
  };
}

const clusterUuid = 'a4545jhjb';
const params: AlertParams = {
  dateFormat: 'YYYY',
  timezone: 'UTC',
};

interface MockServices {
  callCluster: jest.Mock;
  alertInstanceFactory: jest.Mock;
  savedObjectsClient: jest.Mock;
}

const alertExecutorOptions: LicenseExpirationAlertExecutorOptions = {
  alertId: '',
  startedAt: new Date(),
  services: {
    callCluster: (path: string, opts: any) => new Promise(resolve => resolve()),
    alertInstanceFactory: (id: string) => new AlertInstance(),
    savedObjectsClient: {} as jest.Mocked<SavedObjectsClientContract>,
  },
  params: {},
  state: {},
  spaceId: '',
  name: '',
  tags: [],
  previousStartedAt: null,
  createdBy: null,
  updatedBy: null,
};

describe('getLicenseExpiration', () => {
  const emailAddress = 'foo@foo.com';
  const server: any = {
    newPlatform: {
      __internals: {
        uiSettings: {
          asScopedToClient: (): any => ({
            get: () => new Promise(resolve => resolve(emailAddress)),
          }),
        },
      },
    },
  };
  const getMonitoringCluster: () => void = jest.fn();
  const logger: Logger = {
    warn: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    info: jest.fn(),
    get: jest.fn(),
  };
  const getLogger = (): Logger => logger;
  const ccrEnabled = false;

  afterEach(() => {
    (logger.warn as jest.Mock).mockClear();
  });

  it('should have the right id and actionGroups', () => {
    const alert = getLicenseExpiration(server, getMonitoringCluster, getLogger, ccrEnabled);
    expect(alert.id).toBe(ALERT_TYPE_LICENSE_EXPIRATION);
    expect(alert.actionGroups).toEqual([{ id: 'default', name: 'Default' }]);
  });

  it('should return the state if no license is provided', async () => {
    const alert = getLicenseExpiration(server, getMonitoringCluster, getLogger, ccrEnabled);

    const services: MockServices | AlertServices = {
      callCluster: jest.fn(),
      alertInstanceFactory: jest.fn(),
      savedObjectsClient: savedObjectsClientMock.create(),
    };
    const state = { foo: 1 };

    const result = await alert.executor({
      ...alertExecutorOptions,
      services,
      params,
      state,
    });

    expect(result).toEqual(state);
  });

  it('should log a warning if no email is provided', async () => {
    const customServer: any = {
      newPlatform: {
        __internals: {
          uiSettings: {
            asScopedToClient: () => ({
              get: () => null,
            }),
          },
        },
      },
    };
    const alert = getLicenseExpiration(customServer, getMonitoringCluster, getLogger, ccrEnabled);

    const services = {
      callCluster: jest.fn(
        (method: string, { filterPath }): Promise<any> => {
          return new Promise(resolve => {
            if (filterPath.includes('hits.hits._source.license.*')) {
              resolve(
                fillLicense({
                  status: 'good',
                  type: 'basic',
                  expiry_date_in_millis: moment()
                    .add(7, 'days')
                    .valueOf(),
                })
              );
            }
            resolve({});
          });
        }
      ),
      alertInstanceFactory: jest.fn(),
      savedObjectsClient: savedObjectsClientMock.create(),
    };

    const state = {};

    await alert.executor({
      ...alertExecutorOptions,
      services,
      params,
      state,
    });

    expect((logger.warn as jest.Mock).mock.calls.length).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      `Unable to send email for ${ALERT_TYPE_LICENSE_EXPIRATION} because there is no email configured.`
    );
  });

  it('should fire actions if going to expire', async () => {
    const scheduleActions = jest.fn();
    const alertInstanceFactory = jest.fn(
      (id: string): AlertInstance => {
        const instance = new AlertInstance();
        instance.scheduleActions = scheduleActions;
        return instance;
      }
    );

    const alert = getLicenseExpiration(server, getMonitoringCluster, getLogger, ccrEnabled);

    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.get.mockReturnValue(
      new Promise(resolve => {
        const savedObject: SavedObject<SavedObjectAttributes> = {
          id: '',
          type: '',
          references: [],
          attributes: {
            [MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS]: emailAddress,
          },
        };
        resolve(savedObject);
      })
    );
    const services = {
      callCluster: jest.fn(
        (method: string, { filterPath }): Promise<any> => {
          return new Promise(resolve => {
            if (filterPath.includes('hits.hits._source.license.*')) {
              resolve(
                fillLicense(
                  {
                    status: 'active',
                    type: 'gold',
                    expiry_date_in_millis: moment()
                      .add(7, 'days')
                      .valueOf(),
                  },
                  clusterUuid
                )
              );
            }
            resolve({});
          });
        }
      ),
      alertInstanceFactory,
      savedObjectsClient,
    };

    const state = {};

    const result: AlertState = (await alert.executor({
      ...alertExecutorOptions,
      services,
      params,
      state,
    })) as AlertState;

    const newState: AlertClusterState = result[clusterUuid] as AlertClusterState;

    expect(newState.expiredCheckDateMS > 0).toBe(true);
    expect(scheduleActions.mock.calls.length).toBe(1);
    expect(scheduleActions.mock.calls[0][1].subject).toBe(
      'NEW X-Pack Monitoring: License Expiration'
    );
    expect(scheduleActions.mock.calls[0][1].to).toBe(emailAddress);
  });

  it('should fire actions if the user fixed their license', async () => {
    const scheduleActions = jest.fn();
    const alertInstanceFactory = jest.fn(
      (id: string): AlertInstance => {
        const instance = new AlertInstance();
        instance.scheduleActions = scheduleActions;
        return instance;
      }
    );
    const alert = getLicenseExpiration(server, getMonitoringCluster, getLogger, ccrEnabled);

    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.get.mockReturnValue(
      new Promise(resolve => {
        const savedObject: SavedObject<SavedObjectAttributes> = {
          id: '',
          type: '',
          references: [],
          attributes: {
            [MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS]: emailAddress,
          },
        };
        resolve(savedObject);
      })
    );
    const services = {
      callCluster: jest.fn(
        (method: string, { filterPath }): Promise<any> => {
          return new Promise(resolve => {
            if (filterPath.includes('hits.hits._source.license.*')) {
              resolve(
                fillLicense(
                  {
                    status: 'active',
                    type: 'gold',
                    expiry_date_in_millis: moment()
                      .add(120, 'days')
                      .valueOf(),
                  },
                  clusterUuid
                )
              );
            }
            resolve({});
          });
        }
      ),
      alertInstanceFactory,
      savedObjectsClient,
    };

    const state: AlertState = {
      [clusterUuid]: {
        expiredCheckDateMS: moment()
          .subtract(1, 'day')
          .valueOf(),
        ui: { isFiring: true, severity: 0, message: null, resolvedMS: 0, expirationTime: 0 },
      },
    };

    const result: AlertState = (await alert.executor({
      ...alertExecutorOptions,
      services,
      params,
      state,
    })) as AlertState;

    const newState: AlertClusterState = result[clusterUuid] as AlertClusterState;
    expect(newState.expiredCheckDateMS).toBe(0);
    expect(scheduleActions.mock.calls.length).toBe(1);
    expect(scheduleActions.mock.calls[0][1].subject).toBe(
      'RESOLVED X-Pack Monitoring: License Expiration'
    );
    expect(scheduleActions.mock.calls[0][1].to).toBe(emailAddress);
  });

  it('should not fire actions for trial license that expire in more than 14 days', async () => {
    const scheduleActions = jest.fn();
    const alertInstanceFactory = jest.fn(
      (id: string): AlertInstance => {
        const instance = new AlertInstance();
        instance.scheduleActions = scheduleActions;
        return instance;
      }
    );
    const alert = getLicenseExpiration(server, getMonitoringCluster, getLogger, ccrEnabled);

    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.get.mockReturnValue(
      new Promise(resolve => {
        const savedObject: SavedObject<SavedObjectAttributes> = {
          id: '',
          type: '',
          references: [],
          attributes: {
            [MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS]: emailAddress,
          },
        };
        resolve(savedObject);
      })
    );
    const services = {
      callCluster: jest.fn(
        (method: string, { filterPath }): Promise<any> => {
          return new Promise(resolve => {
            if (filterPath.includes('hits.hits._source.license.*')) {
              resolve(
                fillLicense(
                  {
                    status: 'active',
                    type: 'trial',
                    expiry_date_in_millis: moment()
                      .add(15, 'days')
                      .valueOf(),
                  },
                  clusterUuid
                )
              );
            }
            resolve({});
          });
        }
      ),
      alertInstanceFactory,
      savedObjectsClient,
    };

    const state = {};
    const result: AlertState = (await alert.executor({
      ...alertExecutorOptions,
      services,
      params,
      state,
    })) as AlertState;

    const newState: AlertClusterState = result[clusterUuid] as AlertClusterState;
    expect(newState.expiredCheckDateMS).toBe(undefined);
    expect(scheduleActions).not.toHaveBeenCalled();
  });

  it('should fire actions for trial license that in 14 days or less', async () => {
    const scheduleActions = jest.fn();
    const alertInstanceFactory = jest.fn(
      (id: string): AlertInstance => {
        const instance = new AlertInstance();
        instance.scheduleActions = scheduleActions;
        return instance;
      }
    );
    const alert = getLicenseExpiration(server, getMonitoringCluster, getLogger, ccrEnabled);

    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.get.mockReturnValue(
      new Promise(resolve => {
        const savedObject: SavedObject<SavedObjectAttributes> = {
          id: '',
          type: '',
          references: [],
          attributes: {
            [MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS]: emailAddress,
          },
        };
        resolve(savedObject);
      })
    );
    const services = {
      callCluster: jest.fn(
        (method: string, { filterPath }): Promise<any> => {
          return new Promise(resolve => {
            if (filterPath.includes('hits.hits._source.license.*')) {
              resolve(
                fillLicense(
                  {
                    status: 'active',
                    type: 'trial',
                    expiry_date_in_millis: moment()
                      .add(13, 'days')
                      .valueOf(),
                  },
                  clusterUuid
                )
              );
            }
            resolve({});
          });
        }
      ),
      alertInstanceFactory,
      savedObjectsClient,
    };

    const state = {};
    const result: AlertState = (await alert.executor({
      ...alertExecutorOptions,
      services,
      params,
      state,
    })) as AlertState;

    const newState: AlertClusterState = result[clusterUuid] as AlertClusterState;
    expect(newState.expiredCheckDateMS > 0).toBe(true);
    expect(scheduleActions.mock.calls.length).toBe(1);
  });
});
