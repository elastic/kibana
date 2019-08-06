/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPatterns } from 'ui/index_patterns';

export const indexPatternsMock = (new (class {
  fieldFormats = [];
  config = {};
  savedObjectsClient = {};
  refreshSavedObjectsCache = {};
  clearCache = jest.fn();
  get = jest.fn();
  getDefault = jest.fn();
  getFields = jest.fn();
  getIds = jest.fn();
  getTitles = jest.fn();
  make = jest.fn();
})() as unknown) as IndexPatterns;
