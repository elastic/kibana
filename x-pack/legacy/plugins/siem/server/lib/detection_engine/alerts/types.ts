/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';

import { SIGNALS_ID } from '../../../../common/constants';
import { Alert } from '../../../../../alerting/server/types';

// TODO: Migrate the other types over to using this one
export interface SignalAlertParams {
  description: string;
  from: string;
  id: string;
  index: string[];
  interval: string;
  enabled: boolean;
  filter: Record<string, {}> | undefined;
  kql: string | undefined;
  maxSignals: string;
  name: string;
  severity: number;
  type: string; // TODO: Replace this type with a static enum type
  to: string;
}

export type SignalAlertType = Alert & {
  id: string;
  alertTypeParams: SignalAlertParams;
};

export const isAlertType = (obj: unknown): obj is SignalAlertType => {
  return get('alertTypeId', obj) === SIGNALS_ID;
};

export const isAlertTypeArray = (objArray: unknown[]): objArray is SignalAlertType[] => {
  return objArray.length === 0 || isAlertType(objArray[0]);
};
