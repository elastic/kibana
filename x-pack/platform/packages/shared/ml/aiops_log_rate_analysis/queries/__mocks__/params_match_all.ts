/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const paramsMock = {
  index: 'the-index',
  timeFieldName: 'the-time-field-name',
  start: 0,
  end: 50,
  baselineMin: 10,
  baselineMax: 20,
  deviationMin: 30,
  deviationMax: 40,
  searchQuery: '{ "match_all": {} }',
};
