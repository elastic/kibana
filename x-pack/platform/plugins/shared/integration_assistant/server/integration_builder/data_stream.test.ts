/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureDirSync, createSync, copySync } from '../util';
import { DataStream, Docs, InputType, Pipeline } from '../../common';
import { createDataStream } from './data_stream';
import { render } from 'nunjucks';

jest.mock('nunjucks');

jest.mock('../util', () => ({
  ...jest.requireActual('../util'),
  removeDirSync: jest.fn(),
  ensureDirSync: jest.fn(),
  createSync: jest.fn(),
  copySync: jest.fn(),
  generateUniqueId: jest.fn(),
  generateFields: jest.fn(),
}));

beforeEach(async () => {
  jest.clearAllMocks();
});

describe('createDataStream', () => {
  const packageName = 'package';
  const dataStreamPath = 'path';
  const firstDatastreamName = 'datastream_1';
  const firstDataStreamInputTypes: InputType[] = ['filestream', 'azure-eventhub'];
  const firstDataStreamDocs: Docs = [
    {
      key: 'foo',
      anotherKey: 'bar',
    },
  ];
  const firstDataStreamPipeline: Pipeline = {
    processors: [
      {
        set: {
          field: 'ecs.version',
          value: '8.11.0',
        },
      },
    ],
  };
  const samples = '{"test1": "test1"}';
  const firstDataStream: DataStream = {
    name: firstDatastreamName,
    title: 'Datastream_1',
    description: 'Datastream_1 description',
    inputTypes: firstDataStreamInputTypes,
    docs: firstDataStreamDocs,
    rawSamples: [samples],
    pipeline: firstDataStreamPipeline,
    samplesFormat: { name: 'ndjson', multiline: false },
  };

  const celDataStream: DataStream = {
    name: firstDatastreamName,
    title: 'Datastream_1',
    description: 'Datastream_1 description',
    inputTypes: ['cel'] as InputType[],
    docs: firstDataStreamDocs,
    rawSamples: [samples],
    pipeline: firstDataStreamPipeline,
    samplesFormat: { name: 'ndjson', multiline: false },
    celInput: {
      url: 'https://sample.com',
      program: 'line1\nline2',
      authType: 'basic',
      stateSettings: { setting1: 100, setting2: '' },
      redactVars: ['setting2'],
      configFields: { setting1: {}, setting2: {} },
      needsAuthConfigBlock: false,
    },
  };

  it('Should create expected directories and files', async () => {
    createDataStream(packageName, dataStreamPath, firstDataStream);

    // pipeline
    expect(ensureDirSync).toHaveBeenCalledWith(dataStreamPath);
    expect(ensureDirSync).toHaveBeenCalledWith(`${dataStreamPath}/elasticsearch/ingest_pipeline`);

    // dataStream files
    expect(copySync).toHaveBeenCalledWith(expect.any(String), `${dataStreamPath}/fields`);

    // test files
    expect(ensureDirSync).toHaveBeenCalledWith(`${dataStreamPath}/_dev/test/pipeline`);
    expect(copySync).toHaveBeenCalledWith(
      expect.any(String),
      `${dataStreamPath}/_dev/test/pipeline/test-common-config.yml`
    );
    expect(createSync).toHaveBeenCalledWith(
      `${dataStreamPath}/_dev/test/pipeline/test-${packageName}-datastream-1.log`,
      samples
    );

    // // Manifest files
    expect(createSync).toHaveBeenCalledWith(`${dataStreamPath}/manifest.yml`, undefined);
    expect(render).toHaveBeenCalledWith(`filestream_manifest.yml.njk`, expect.anything());
    expect(render).toHaveBeenCalledWith(`azure_eventhub_manifest.yml.njk`, expect.anything());
  });

  it('Should return the list of fields', async () => {
    const fields = createDataStream(packageName, dataStreamPath, firstDataStream);

    expect(Array.isArray(fields)).toBe(true);
    fields.forEach((field) => {
      expect(field).toMatchObject({
        name: expect.any(String),
        type: expect.any(String),
      });
    });
  });

  it('Should populate expected CEL fields', async () => {
    createDataStream(packageName, dataStreamPath, celDataStream);

    // // Manifest files
    expect(createSync).toHaveBeenCalledWith(`${dataStreamPath}/manifest.yml`, undefined);
    expect(render).toHaveBeenCalledWith(`cel_manifest.yml.njk`, expect.anything());
  });
});
