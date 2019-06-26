/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const items = {};
export const mockWindow = {
  sessionStorage: {
    setItem(key, value) {
      items[key] = value;
    },
    getItem(key) {
      return items[key];
    },
    removeItem(key) {
      delete items[key];
    }
  },
  location: {
    pathname: ''
  }
};
