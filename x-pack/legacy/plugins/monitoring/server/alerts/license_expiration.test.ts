/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { getLicenseExpiration } from './license_expiration';
import {
  ALERT_TYPE_LICENSE_EXPIRATION,
  MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS,
} from '../../common/constants';
import { Logger } from 'src/core/server';
import { AlertServices } from '../../../alerting/server/types';
import { SavedObjectsClientMock } from 'src/core/server/mocks';
import { AlertInstance } from '../../../alerting/server/lib';
import { AlertState } from './types';
import { SavedObject, SavedObjectAttributes } from 'src/core/server';

function fillLicense(license: any) {
  return {
    hits: {
      hits: [
        {
          _source: {
            license,
          },
        },
      ],
    },
  };
}

describe('getLicenseExpiration', () => {
  const getMonitoringCluster: () => void = jest.fn();
  const logger: Logger = {
    warn: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    info: jest.fn(),
  };
  const getLogger = (): Logger => logger;

  afterEach(() => {
    (logger.warn as jest.Mock).mockClear();
  });

  it('should have the right id and actionGroups', () => {
    const alert = getLicenseExpiration(getMonitoringCluster, getLogger);
    expect(alert.id).toBe(ALERT_TYPE_LICENSE_EXPIRATION);
    expect(alert.actionGroups).toEqual(['default']);
  });

  interface MockServices {
    callCluster: jest.Mock;
    alertInstanceFactory: jest.Mock;
    savedObjectsClient: jest.Mock;
  }
  it('should return the state if no license is provided', async () => {
    const alert = getLicenseExpiration(getMonitoringCluster, getLogger);

    const services: MockServices | AlertServices = {
      callCluster: jest.fn(),
      alertInstanceFactory: jest.fn(),
      savedObjectsClient: SavedObjectsClientMock.create(),
    };
    const params = {
      clusterUuid: '1abd45',
    };
    const state = { foo: 1 };

    const result = await alert.executor({
      alertId: '',
      startedAt: new Date(),
      services,
      params,
      state,
    });

    expect(result).toEqual(state);
  });

  it('should log a warning if no email is provided', async () => {
    const alert = getLicenseExpiration(getMonitoringCluster, getLogger);

    const services = {
      callCluster: jest.fn(
        (method: string, params): Promise<any> => {
          return new Promise(resolve => {
            if (params.filterPath === 'hits.hits._source.license.*') {
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
      savedObjectsClient: SavedObjectsClientMock.create(),
    };

    const params = {
      clusterUuid: '1abd45',
    };
    const state = {};

    await alert.executor({
      alertId: '',
      startedAt: new Date(),
      services,
      params,
      state,
    });

    expect((logger.warn as jest.Mock).mock.calls.length).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      `Unable to send email for ${ALERT_TYPE_LICENSE_EXPIRATION} because there is no email configured.` +
        ` Please configure 'xpack.monitoring.cluster_alerts.email_notifications.email_address'.`
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
    const emailAddress = 'foo@foo.com';
    const alert = getLicenseExpiration(getMonitoringCluster, getLogger);

    const savedObjectsClient = SavedObjectsClientMock.create();
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
        (method: string, params): Promise<any> => {
          return new Promise(resolve => {
            if (params.filterPath === 'hits.hits._source.license.*') {
              resolve(
                fillLicense({
                  status: 'active',
                  type: 'gold',
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
      alertInstanceFactory,
      savedObjectsClient,
    };

    const params = {
      clusterUuid: '1abd45',
    };
    const state = {};

    const result = await alert.executor({
      alertId: '',
      startedAt: new Date(),
      services,
      params,
      state,
    });

    expect((result as AlertState).expired_check_date_in_millis > 0).toBe(true);
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
    const emailAddress = 'foo@foo.com';
    const alert = getLicenseExpiration(getMonitoringCluster, getLogger);

    const savedObjectsClient = SavedObjectsClientMock.create();
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
        (method: string, params): Promise<any> => {
          return new Promise(resolve => {
            if (params.filterPath === 'hits.hits._source.license.*') {
              resolve(
                fillLicense({
                  status: 'active',
                  type: 'gold',
                  expiry_date_in_millis: moment()
                    .add(120, 'days')
                    .valueOf(),
                })
              );
            }
            resolve({});
          });
        }
      ),
      alertInstanceFactory,
      savedObjectsClient,
    };

    const params = {
      clusterUuid: '1abd45',
    };
    const state = {
      expired_check_date_in_millis: moment()
        .subtract(1, 'day')
        .valueOf(),
    };

    const result = await alert.executor({
      alertId: '',
      startedAt: new Date(),
      services,
      params,
      state,
    });

    expect((result as AlertState).expired_check_date_in_millis).toBe(0);
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
    const emailAddress = 'foo@foo.com';
    const alert = getLicenseExpiration(getMonitoringCluster, getLogger);

    const savedObjectsClient = SavedObjectsClientMock.create();
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
        (method: string, params): Promise<any> => {
          return new Promise(resolve => {
            if (params.filterPath === 'hits.hits._source.license.*') {
              resolve(
                fillLicense({
                  status: 'active',
                  type: 'trial',
                  expiry_date_in_millis: moment()
                    .add(15, 'days')
                    .valueOf(),
                })
              );
            }
            resolve({});
          });
        }
      ),
      alertInstanceFactory,
      savedObjectsClient,
    };

    const params = {
      clusterUuid: '1abd45',
    };
    const state = {};

    const result = await alert.executor({
      alertId: '',
      startedAt: new Date(),
      services,
      params,
      state,
    });
    expect((result as AlertState).expired_check_date_in_millis).toBe(0);
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
    const emailAddress = 'foo@foo.com';
    const alert = getLicenseExpiration(getMonitoringCluster, getLogger);

    const savedObjectsClient = SavedObjectsClientMock.create();
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
        (method: string, params): Promise<any> => {
          return new Promise(resolve => {
            if (params.filterPath === 'hits.hits._source.license.*') {
              resolve(
                fillLicense({
                  status: 'active',
                  type: 'trial',
                  expiry_date_in_millis: moment()
                    .add(13, 'days')
                    .valueOf(),
                })
              );
            }
            resolve({});
          });
        }
      ),
      alertInstanceFactory,
      savedObjectsClient,
    };

    const params = {
      clusterUuid: '1abd45',
    };
    const state = {};

    const result = await alert.executor({
      alertId: '',
      startedAt: new Date(),
      services,
      params,
      state,
    });
    expect((result as AlertState).expired_check_date_in_millis > 0).toBe(true);
    expect(scheduleActions.mock.calls.length).toBe(1);
  });
});
