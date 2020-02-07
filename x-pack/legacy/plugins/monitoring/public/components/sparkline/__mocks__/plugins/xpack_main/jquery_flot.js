/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-env jest */

function $() {
  return {
    on: jest.fn(),
    off: jest.fn(),
  };
}

$.plot = () => ({
  shutdown: jest.fn(),
});

module.exports = $;
