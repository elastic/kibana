/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



export function cloudServiceProvider(config) {
  function isRunningOnCloud() {
    try {
      return config.get('cloud.enabled');
    } catch (error) {
      return false;
    }
  }

  function getCloudId() {
    try {
      return config.get('cloud.id');
    } catch (error) {
      return undefined;
    }
  }

  return {
    isRunningOnCloud,
    getCloudId
  };
}
