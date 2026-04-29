/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

let config: { [key: string]: unknown } = {};

export const setConfig = (externalConfig: { [key: string]: unknown }) => {
  config = externalConfig;
};

export const isReactMigrationEnabled = () => {
  return config.renderReactApp;
};
