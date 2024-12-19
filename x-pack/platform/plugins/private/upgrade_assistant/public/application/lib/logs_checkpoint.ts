/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

import { Storage } from '../../shared_imports';

const SETTING_ID = 'kibana.upgradeAssistant.lastCheckpoint';
const localStorage = new Storage(window.localStorage);

export const loadLogsCheckpoint = () => {
  const storedValue = moment(localStorage.get(SETTING_ID));

  if (storedValue.isValid()) {
    return storedValue.toISOString();
  }

  const now = moment().toISOString();
  localStorage.set(SETTING_ID, now);

  return now;
};

export const saveLogsCheckpoint = (value: string) => {
  localStorage.set(SETTING_ID, value);
};
