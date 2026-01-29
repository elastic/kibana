/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type LogsSourceOption = 'upload' | 'index';

export interface IntegrationFields {
  title: string;
  description: string;
  logo?: string;
  connectorId: string;
}

export interface DataStreamFields {
  dataStreamTitle: string;
  dataStreamDescription: string;
  dataCollectionMethod: string[];
  logsSourceOption: LogsSourceOption;
  logSample: string | undefined;
  selectedIndex: string;
}

export interface IntegrationFormData extends IntegrationFields, DataStreamFields {
  /**
   * If set, indicates we're adding a data stream to an existing integration.
   * If undefined, we're creating a new integration.
   */
  integrationId?: string;
}
