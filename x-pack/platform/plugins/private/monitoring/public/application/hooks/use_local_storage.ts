/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { has } from 'lodash';

interface ParsedMonitoringData {
  [key: string]: any;
}
export const useLocalStorage = <Value>(key: string, defaultValue: Value): [Value, Function] => {
  const localStorageMonitoringKey = 'xpack.monitoring.data';
  const getMonitoringDataStorage = () => {
    const monitoringDataStorage = window.localStorage.getItem(localStorageMonitoringKey);
    let parsedData: ParsedMonitoringData = {};
    try {
      parsedData = (monitoringDataStorage && JSON.parse(monitoringDataStorage)) || {};
    } catch (e) {
      throw new Error('Monitoring UI: error parsing locally stored monitoring data');
    }
    return parsedData;
  };
  const saveToStorage = (value: Value) => {
    const monitoringDataObj = getMonitoringDataStorage();
    monitoringDataObj[key] = value;
    window.localStorage.setItem(localStorageMonitoringKey, JSON.stringify(monitoringDataObj));
  };
  const getFromStorage = (): Value | undefined => {
    const monitoringDataObj = getMonitoringDataStorage();
    if (has(monitoringDataObj, key)) {
      return monitoringDataObj[key];
    }
  };

  const storedItem = getFromStorage();
  if (!storedItem) {
    saveToStorage(defaultValue);
  }
  const toStore = storedItem || defaultValue;

  const [item, setItem] = useState<Value>(toStore);

  const saveItem = (value: Value) => {
    saveToStorage(value);
    setItem(value);
  };

  return [item, saveItem];
};
