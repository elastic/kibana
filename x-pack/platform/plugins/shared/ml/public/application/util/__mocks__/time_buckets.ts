/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const timeBucketsMock = {
  setBarTarget: jest.fn(),
  setMaxBars: jest.fn(),
  setInterval: jest.fn(),
  setBounds: jest.fn(),
  getBounds: jest.fn(),
  getInterval: jest.fn(),
  getScaledDateFormat: jest.fn(),
};
