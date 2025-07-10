/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configure, Environment } from 'nunjucks';
import { join as joinPath } from 'path';
import { testIntegration } from '../../__jest__/fixtures/build_integration';
import { DataStream } from '../../common';
import { createSync, ensureDirSync } from '../util';
import { createReadme } from './readme_files';

jest.mock('../util', () => ({
  ...jest.requireActual('../util'),
  createSync: jest.fn(),
  ensureDirSync: jest.fn(),
}));

describe('createReadme', () => {
  const getTemplateSpy = jest.spyOn(Environment.prototype, 'getTemplate');
  const integrationPath = 'path';

  const templateDir = joinPath(__dirname, '../templates');
  configure([templateDir], {
    autoescape: false,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('Should create expected files', async () => {
    const fields = [
      {
        datastream: 'data_stream_1',
        fields: [
          {
            name: 'data_stream.type',
            type: 'constant_keyword',
            description: 'Data stream type.',
          },
          {
            name: 'data_stream.dataset',
            type: 'constant_keyword',
            description: 'Data stream dataset name.',
          },
          {
            name: 'event.dataset',
            type: 'constant_keyword',
            description: 'Event dataset',
            value: 'package.datastream',
          },
          { name: '@timestamp', type: 'date', description: 'Event timestamp.' },
        ],
      },
      {
        datastream: 'data_stream_2',
        fields: [{ name: '@timestamp', type: 'date', description: 'Event timestamp.' }],
      },
    ];

    createReadme(integrationPath, testIntegration.name, testIntegration.dataStreams, fields);

    expect(createSync).toHaveBeenCalledWith(
      `${integrationPath}/_dev/build/docs/README.md`,
      expect.any(String)
    );

    // Docs files
    expect(ensureDirSync).toHaveBeenCalledWith(`${integrationPath}/docs/`);
    expect(createSync).toHaveBeenCalledWith(
      `${integrationPath}/docs/README.md`,
      expect.any(String)
    );
  });

  it('Should render a table per datastream with fields mapping in package readme', async () => {
    const fields = [
      {
        datastream: 'data_stream_1',
        fields: [
          {
            name: 'data_stream.type',
            type: 'constant_keyword',
            description: 'Data stream type.',
          },
          {
            name: 'data_stream.dataset',
            type: 'constant_keyword',
          },
          {
            name: 'event.dataset',
            type: 'constant_keyword',
            description: 'Event dataset',
            value: 'package.datastream',
          },
          { name: '@timestamp', type: 'date', description: 'Event timestamp.' },
        ],
      },
      {
        datastream: 'data_stream_2',
        fields: [{ name: '@timestamp', type: 'date', description: 'Event timestamp.' }],
      },
    ];

    createReadme(integrationPath, testIntegration.name, testIntegration.dataStreams, fields);

    const firstDatastreamFieldsDisplayed = `
| Field | Description | Type |
|---|---|---|
| data_stream.type | Data stream type. | constant_keyword |
| data_stream.dataset |  | constant_keyword |
| event.dataset | Event dataset | constant_keyword |
| @timestamp | Event timestamp. | date |
`;

    const secondDatastreamFieldsDisplayed = `
| Field | Description | Type |
|---|---|---|
| @timestamp | Event timestamp. | date |
`;

    expect(createSync).toHaveBeenCalledWith(
      `${integrationPath}/docs/README.md`,
      expect.stringContaining(firstDatastreamFieldsDisplayed)
    );

    expect(createSync).toHaveBeenCalledWith(
      `${integrationPath}/docs/README.md`,
      expect.stringContaining(secondDatastreamFieldsDisplayed)
    );
  });

  it('Should not render a fields mapping table in build readme', async () => {
    const fields = [
      {
        datastream: 'data_stream_1',
        fields: [{ name: '@timestamp', type: 'date', description: 'Event timestamp.' }],
      },
    ];

    createReadme(integrationPath, testIntegration.name, testIntegration.dataStreams, fields);

    expect(createSync).toHaveBeenCalledWith(
      `${integrationPath}/_dev/build/docs/README.md`,
      expect.stringContaining('{{fields "data_stream_1"}}')
    );
  });

  it('Should render a formatted table per datastream with fields mapping in package readme', async () => {
    const fields = [
      {
        datastream: 'data_stream_1',
        fields: [
          {
            name: 'data_stream.type',
            type: 'constant_keyword',
            description: 'Data stream type.\n',
          },
          {
            name: 'data_stream.dataset',
            type: 'constant_keyword',
          },
        ],
      },
    ];

    createReadme(integrationPath, testIntegration.name, testIntegration.dataStreams, fields);

    const firstDatastreamFieldsDisplayed = `
| Field | Description | Type |
|---|---|---|
| data_stream.type | Data stream type. | constant_keyword |
| data_stream.dataset |  | constant_keyword |
`;

    expect(createSync).toHaveBeenCalledWith(
      `${integrationPath}/docs/README.md`,
      expect.stringContaining(firstDatastreamFieldsDisplayed)
    );
  });

  it('Should call input setup and troubleshooting templates', () => {
    const dataStreams = [
      {
        name: 'example-datastream',
        inputTypes: ['filestream', 'tcp', 'udp'],
      },
    ] as DataStream[];

    createReadme(integrationPath, testIntegration.name, dataStreams, []);

    const calledTemplateNames = getTemplateSpy.mock.calls.map((call) => call[0]);
    expect(calledTemplateNames).toEqual(
      expect.arrayContaining([
        expect.stringContaining('./readme/setup/filestream.md.njk'),
        expect.stringContaining('./readme/setup/tcp.md.njk'),
        expect.stringContaining('./readme/setup/udp.md.njk'),
        expect.stringContaining('./readme/troubleshooting/filestream.md.njk'),
        expect.stringContaining('./readme/troubleshooting/tcp.md.njk'),
        expect.stringContaining('./readme/troubleshooting/udp.md.njk'),
      ])
    );
  });

  it('Should not throw any error if input template does not exist', () => {
    const dataStreams = [
      {
        name: 'example-datastream',
        inputTypes: ['fake'],
      },
    ] as unknown as DataStream[];

    expect(() =>
      createReadme(integrationPath, testIntegration.name, dataStreams, [])
    ).not.toThrow();

    const calledTemplateNames = getTemplateSpy.mock.calls.map((call) => call[0]);
    expect(calledTemplateNames).toEqual(
      expect.arrayContaining([
        expect.stringContaining('./readme/setup/fake.md.njk'),
        expect.stringContaining('./readme/troubleshooting/fake.md.njk'),
      ])
    );
  });

  it('Should pass a list of unique input types to the readme', () => {
    const dataStreams = [
      {
        name: 'datastream1',
        inputTypes: ['filestream', 'tcp', 'udp'],
      },
      {
        name: 'datastream2',
        inputTypes: ['filestream', 'tcp', 'aws-s3'],
      },
    ] as DataStream[];

    createReadme(integrationPath, testIntegration.name, dataStreams, []);

    const calls = getTemplateSpy.mock.calls;
    for (const input of ['filestream', 'tcp', 'udp', 'aws-s3']) {
      const filteredCalls = calls.filter(
        (call) =>
          call.some(
            (arg) => typeof arg === 'string' && arg.includes(`./readme/setup/${input}.md.njk`)
          ) && call.some((arg) => typeof arg === 'string' && arg.includes('description_readme.njk'))
      );

      // Assert that there are exactly 2 calls for each input type (one for the build_readme and one for the package_readme)
      expect(filteredCalls.length).toBe(2);
    }
  });

  it('Should call ssl template if input can be configured with ssl', () => {
    const dataStreams = [
      {
        name: 'example-datastream',
        inputTypes: ['aws-s3'],
      },
    ] as DataStream[];

    createReadme(integrationPath, testIntegration.name, dataStreams, []);

    const calledTemplateNames = getTemplateSpy.mock.calls.map((call) => call[0]);
    expect(calledTemplateNames).toEqual(
      expect.arrayContaining([expect.stringContaining('./readme/setup/ssl-tls.md.njk')])
    );
  });

  it('Should not call ssl template if input cannot be configured with ssl', () => {
    const dataStreams = [
      {
        name: 'example-datastream',
        inputTypes: ['journald'],
      },
    ] as DataStream[];

    createReadme(integrationPath, testIntegration.name, dataStreams, []);

    const calledTemplateNames = getTemplateSpy.mock.calls.map((call) => call[0]);
    expect(calledTemplateNames).not.toContain('./readme/setup/ssl-tls.md.njk');
  });
});
