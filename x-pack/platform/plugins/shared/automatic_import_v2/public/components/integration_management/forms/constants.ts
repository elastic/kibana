/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const MAX_NAME_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 200;
export const MAX_LOGO_SIZE_BYTES = 1024 * 1024;

export const DEFAULT_DATA_STREAM_VALUES = {
  dataStreamTitle: '',
  dataStreamDescription: '',
  dataCollectionMethod: [] as string[],
  logsSourceOption: 'upload' as const,
  logSample: undefined,
  selectedIndex: '',
};

export const DEFAULT_INTEGRATION_VALUES = {
  title: '',
  description: '',
  logo: undefined,
  connectorId: '',
};
