/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Moment } from 'moment';
import { AlertExecutorOptions } from '../../../alerting';

export interface AlertLicense {
  status: string;
  type: string;
  expiry_date_in_millis: number;
  cluster_uuid: string;
  cluster_name: string;
}

export interface AlertState {
  [clusterUuid: string]: {
    expired_check_date_in_millis: number | Moment;
  };
}

export interface AlertCluster {
  cluster_uuid: string;
}

export interface LicenseExpirationAlertExecutorOptions extends AlertExecutorOptions {
  state: AlertState;
}
