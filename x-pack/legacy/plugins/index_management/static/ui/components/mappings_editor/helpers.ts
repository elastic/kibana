/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const propertiesArrayToObject = (properties: any[]): any =>
  properties.reduce((acc, property) => {
    const { name, ...rest } = property;
    acc[property.name] = rest;
    return acc;
  }, {});
