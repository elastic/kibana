/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Moment } from 'moment';
import { AlertExecutorOptions } from '../../../../../plugins/alerting/server';

export interface AlertLicense {
  status: string;
  type: string;
  expiryDateMS: number;
  clusterUuid: string;
  clusterName: string;
}

export interface AlertState {
  [clusterUuid: string]: AlertClusterState;
}

export interface AlertClusterState {
  expiredCheckDateMS: number | Moment;
  ui: AlertClusterUiState;
}

export interface AlertClusterUiState {
  isFiring: boolean;
  severity: number;
  message: string | null;
  resolvedMS: number;
  expirationTime: number;
}

export interface AlertCluster {
  clusterUuid: string;
}

export interface LicenseExpirationAlertExecutorOptions extends AlertExecutorOptions {
  state: AlertState;
}

export interface AlertParams {
  dateFormat: string;
  timezone: string;
}
