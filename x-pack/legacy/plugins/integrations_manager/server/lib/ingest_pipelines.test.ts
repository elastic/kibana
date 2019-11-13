/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rewriteIngestPipeline } from './ingest_pipelines';
import { readFileSync } from 'fs';
import path from 'path';

test('a pipeline with pipeline references is correctly rewritten', () => {
  const input = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/real_input.json')
  ).toString('utf-8');
  const output = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/real_output.json')
  ).toString('utf-8');

  const substitutions = [
    {
      source: 'pipeline-json',
      target: 'new-pipeline-json',
      templateFunction: 'IngestPipeline',
    },
    {
      source: 'pipeline-plaintext',
      target: 'new-pipeline-plaintext',
      templateFunction: 'IngestPipeline',
    },
  ];
  expect(rewriteIngestPipeline(input, substitutions)).toBe(output);
});
