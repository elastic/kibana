/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiAnalysisState } from '../../server/types';

export const apiAnalysisTestState: ApiAnalysisState = {
  dataStreamName: 'testDataStream',
  lastExecutedChain: 'testchain',
  results: { test: 'testResults' },
  pathOptions: { '/path1': 'path1 description', '/path2': 'path2 description' },
  suggestedPaths: ['/path1'],
};

export const apiAnalysisPathSuggestionsMockedResponse = ['/path1', '/path2', '/path3', '/path4'];

export const apiAnalysisExpectedResults = {
  suggestedPaths: ['/path1', '/path2', '/path3', '/path4'],
};
