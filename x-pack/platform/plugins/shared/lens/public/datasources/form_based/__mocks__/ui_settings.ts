/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const defaultUiSettingsGet = (key: string) => {
  switch (key) {
    case 'dateFormat':
      return 'MMM D, YYYY @ HH:mm:ss.SSS';
    case 'dateFormat:scaled':
      return [[]];
    case 'dateFormat:tz':
      return 'UTC';
    case 'histogram:barTarget':
      return 50;
    case 'histogram:maxBars':
      return 100;
  }
};
