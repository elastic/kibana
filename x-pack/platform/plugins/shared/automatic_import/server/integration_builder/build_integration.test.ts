/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yaml from 'js-yaml';
import { testIntegration } from '../../__jest__/fixtures/build_integration';
import { DataStream, Docs, InputType, Integration, Pipeline } from '../../common';
import { createSync, ensureDirSync, generateUniqueId } from '../util';
import { createAgentInput } from './agent';
import {
  buildPackage,
  isValidDatastreamName,
  isValidName,
  renderPackageManifestYAML,
} from './build_integration';
import { createDataStream } from './data_stream';
import { createFieldMapping } from './fields';
import { createPipeline } from './pipeline';
import { createReadme } from './readme_files';

const mockedDataPath = 'path';
const mockedId = 123;

jest.mock('../util');
jest.mock('./data_stream');
jest.mock('./fields');
jest.mock('./agent');
jest.mock('./pipeline');
jest.mock('./readme_files');

(createFieldMapping as jest.Mock).mockReturnValue([]);
(createDataStream as jest.Mock).mockReturnValue([]);

(generateUniqueId as jest.Mock).mockReturnValue(mockedId);

jest.mock('@kbn/utils', () => ({
  getDataPath: jest.fn(() => mockedDataPath),
}));

jest.mock('adm-zip', () => {
  return jest.fn().mockImplementation(() => ({
    addLocalFolder: jest.fn(),
    toBuffer: jest.fn(),
    addFile: jest.fn(),
  }));
});

describe('buildPackage', () => {
  const packagePath = `${mockedDataPath}/automatic-import-${mockedId}`;
  const integrationPath = `${packagePath}/integration-1.0.0`;

  const firstDatastreamName = 'datastream_one';
  const secondDatastreamName = 'datastream_two';

  const firstDataStreamInputTypes: InputType[] = ['filestream', 'kafka'];
  const secondDataStreamInputTypes: InputType[] = ['kafka'];

  const firstDataStreamDocs: Docs = [
    {
      key: 'foo',
      anotherKey: 'bar',
    },
  ];
  const secondDataStreamDocs: Docs = [{}];

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
  const secondDataStreamPipeline: Pipeline = { processors: [] };

  const firstDataStream: DataStream = {
    name: firstDatastreamName,
    title: 'datastream_one',
    description: 'datastream_one description',
    inputTypes: firstDataStreamInputTypes,
    docs: firstDataStreamDocs,
    rawSamples: ['{"test1": "test1"}'],
    pipeline: firstDataStreamPipeline,
    samplesFormat: { name: 'ndjson', multiline: false },
  };

  const secondDataStream: DataStream = {
    name: secondDatastreamName,
    title: 'datastream_two',
    description: 'datastream_two description',
    inputTypes: secondDataStreamInputTypes,
    docs: secondDataStreamDocs,
    rawSamples: ['{"test1": "test1"}'],
    pipeline: secondDataStreamPipeline,
    samplesFormat: { name: 'ndjson', multiline: false },
  };

  const firstDatastreamPath = `${integrationPath}/data_stream/${firstDatastreamName}`;
  const secondDatastreamPath = `${integrationPath}/data_stream/${secondDatastreamName}`;

  testIntegration.dataStreams = [firstDataStream, secondDataStream];

  beforeEach(async () => {
    jest.clearAllMocks();
    await buildPackage(testIntegration);
  });

  it('Should create expected directories and files', async () => {
    // Package & integration folders
    expect(ensureDirSync).toHaveBeenCalledWith(packagePath);
    expect(ensureDirSync).toHaveBeenCalledWith(integrationPath);

    // _dev files
    expect(ensureDirSync).toHaveBeenCalledWith(`${integrationPath}/_dev/build`);
    expect(createSync).toHaveBeenCalledWith(
      `${integrationPath}/_dev/build/build.yml`,
      expect.any(String)
    );

    // Changelog file
    expect(createSync).toHaveBeenCalledWith(`${integrationPath}/changelog.yml`, expect.any(String));

    // Manifest files
    expect(createSync).toHaveBeenCalledWith(`${integrationPath}/manifest.yml`, expect.any(String));
  });

  it('Should not create logo files if info is not present in the integration', async () => {
    jest.clearAllMocks();
    testIntegration.logo = undefined;

    await buildPackage(testIntegration);

    expect(ensureDirSync).not.toHaveBeenCalledWith(`${integrationPath}/img`);
    expect(createSync).not.toHaveBeenCalledWith(
      `${integrationPath}/img/logo.svg`,
      expect.any(Buffer)
    );
  });

  it('Should call createDataStream for each datastream', async () => {
    expect(createDataStream).toHaveBeenCalledWith(
      'integration',
      firstDatastreamPath,
      firstDataStream
    );
    expect(createDataStream).toHaveBeenCalledWith(
      'integration',
      secondDatastreamPath,
      secondDataStream
    );
  });

  it('Should call createAgentInput for each datastream', async () => {
    expect(createAgentInput).toHaveBeenCalledWith(
      firstDatastreamPath,
      firstDataStreamInputTypes,
      undefined
    );
    expect(createAgentInput).toHaveBeenCalledWith(
      secondDatastreamPath,
      secondDataStreamInputTypes,
      undefined
    );
  });

  it('Should call createPipeline for each datastream', async () => {
    expect(createPipeline).toHaveBeenCalledWith(firstDatastreamPath, firstDataStreamPipeline);
    expect(createPipeline).toHaveBeenCalledWith(secondDatastreamPath, secondDataStreamPipeline);
  });

  it('Should call createFieldMapping for each datastream', async () => {
    expect(createFieldMapping).toHaveBeenCalledWith(
      'integration',
      firstDatastreamName,
      firstDatastreamPath,
      firstDataStreamDocs
    );
    expect(createFieldMapping).toHaveBeenCalledWith(
      'integration',
      secondDatastreamName,
      secondDatastreamPath,
      secondDataStreamDocs
    );
  });

  it('Should call createReadme once with sorted fields', async () => {
    jest.clearAllMocks();

    const firstDSFieldsMapping = [{ name: 'name_a', description: 'description 1', type: 'type 1' }];

    const firstDataStreamFields = [
      { name: 'name_b', description: 'description 1', type: 'type 1' },
    ];

    const secondDSFieldsMapping = [
      { name: 'name_c', description: 'description 2', type: 'type 2' },
      { name: 'name_e', description: 'description 3', type: 'type 3' },
    ];

    const secondDataStreamFields = [
      { name: 'name_d', description: 'description 2', type: 'type 2' },
    ];

    (createFieldMapping as jest.Mock).mockReturnValueOnce(firstDSFieldsMapping);
    (createDataStream as jest.Mock).mockReturnValueOnce(firstDataStreamFields);

    (createFieldMapping as jest.Mock).mockReturnValueOnce(secondDSFieldsMapping);
    (createDataStream as jest.Mock).mockReturnValueOnce(secondDataStreamFields);

    await buildPackage(testIntegration);

    expect(createReadme).toHaveBeenCalledWith(
      integrationPath,
      testIntegration.name,
      testIntegration.dataStreams,
      [
        {
          datastream: firstDatastreamName,
          fields: [
            { name: 'name_a', description: 'description 1', type: 'type 1' },

            { name: 'name_b', description: 'description 1', type: 'type 1' },
          ],
        },
        {
          datastream: secondDatastreamName,
          fields: [
            { name: 'name_c', description: 'description 2', type: 'type 2' },
            { name: 'name_d', description: 'description 2', type: 'type 2' },
            { name: 'name_e', description: 'description 3', type: 'type 3' },
          ],
        },
      ]
    );
  });
});

describe('renderPackageManifestYAML', () => {
  test('generates the package manifest correctly', () => {
    const integration: Integration = {
      title: 'Sample Integration',
      name: 'sample_integration',
      description:
        '  This is a sample integration\n\nWith multiple lines   and    weird  spacing. \n\n  And more lines  ',
      logo: 'some-logo.png',
      dataStreams: [
        {
          name: 'data_stream_one',
          title: 'Data Stream 1',
          description: 'This is data stream 1',
          inputTypes: ['filestream'],
          rawSamples: ['{field: "value"}'],
          pipeline: {
            processors: [],
          },
          docs: [],
          samplesFormat: { name: 'ndjson', multiline: false },
        },
        {
          name: 'data_stream_two',
          title: 'Data Stream 2',
          description:
            'This is data stream 2\nWith multiple lines of description\nBut otherwise, nothing special',
          inputTypes: ['aws-cloudwatch'],
          pipeline: {
            processors: [],
          },
          rawSamples: ['field="value"'],
          docs: [],
          samplesFormat: { name: 'structured' },
        },
      ],
    };

    const manifestContent = renderPackageManifestYAML(integration);

    // The manifest content must be parseable as YAML.
    const manifest = yaml.load(manifestContent) as Record<string, unknown>;

    expect(manifest).toBeDefined();
    expect(manifest.title).toBe(integration.title);
    expect(manifest.name).toBe(integration.name);
    expect(manifest.type).toBe('integration');
    expect(manifest.description).toBe(integration.description);
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect((manifest.icons as object[]).length).toBe(1);
    expect((manifest.icons as object[])[0]).toEqual({
      src: '/img/logo.svg',
      title: 'Sample Integration Logo',
      size: '32x32',
      type: 'image/svg+xml',
    });
  });
});

describe('isValidName', () => {
  it('should return true for valid names', () => {
    expect(isValidName('validname')).toBe(true);
    expect(isValidName('valid_name')).toBe(true);
    expect(isValidName('anothervalidname')).toBe(true);
  });
  it('should return false for names starting with numbers', () => {
    expect(isValidName('123name')).toBe(false);
    expect(isValidName('1name')).toBe(false);
    expect(isValidName('999invalid')).toBe(false);
  });

  it('should return false for names starting with underscore', () => {
    expect(isValidName('_name')).toBe(true);
    expect(isValidName('_invalid_name')).toBe(true);
    expect(isValidName('__name')).toBe(true);
  });

  it('should return true for names starting with letters followed by numbers', () => {
    expect(isValidName('name123')).toBe(true);
    expect(isValidName('valid1')).toBe(true);
    expect(isValidName('valid_123')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isValidName('')).toBe(false);
  });

  it('should return false for names with spaces', () => {
    expect(isValidName('invalid name')).toBe(false);
    expect(isValidName(' invalid')).toBe(false);
    expect(isValidName('invalid ')).toBe(false);
    expect(isValidName('invalid name with spaces')).toBe(false);
  });

  it('should return false for names with special characters', () => {
    expect(isValidName('invalid@name')).toBe(false);
    expect(isValidName('invalid#name')).toBe(false);
    expect(isValidName('invalid$name')).toBe(false);
    expect(isValidName('invalid%name')).toBe(false);
    expect(isValidName('invalid^name')).toBe(false);
    expect(isValidName('invalid&name')).toBe(false);
    expect(isValidName('invalid*name')).toBe(false);
    expect(isValidName('invalid(name')).toBe(false);
    expect(isValidName('invalid/name')).toBe(false);
  });

  it('should return false for names with dashes', () => {
    expect(isValidName('invalid-name')).toBe(false);
    expect(isValidName('invalid-name-with-dashes')).toBe(false);
  });

  it('should return false for names with periods', () => {
    expect(isValidName('invalid.name')).toBe(false);
    expect(isValidName('invalid.name.with.periods')).toBe(false);
  });

  it('should return false for names with mixed invalid characters', () => {
    expect(isValidName('invalid@name#with$special%characters')).toBe(false);
    expect(isValidName('invalid name with spaces and 123')).toBe(false);
  });

  it('should return false for names with empty string', () => {
    expect(isValidName('')).toBe(false);
  });
});

describe('isValidDatastreamName', () => {
  it('should return true for valid names', () => {
    expect(isValidDatastreamName('validname')).toBe(true);
    expect(isValidDatastreamName('valid_name')).toBe(true);
    expect(isValidDatastreamName('anothervalidname')).toBe(true);
    expect(isValidDatastreamName('ab')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isValidDatastreamName('')).toBe(false);
  });

  it('should return false for single char', () => {
    expect(isValidDatastreamName('a')).toBe(false);
  });

  it('should return false for names with spaces', () => {
    expect(isValidDatastreamName('invalid name')).toBe(false);
    expect(isValidDatastreamName(' invalid')).toBe(false);
    expect(isValidDatastreamName('invalid ')).toBe(false);
    expect(isValidDatastreamName('invalid name with spaces')).toBe(false);
  });

  it('should return false for names with special characters', () => {
    expect(isValidDatastreamName('invalid@name')).toBe(false);
    expect(isValidDatastreamName('invalid#name')).toBe(false);
    expect(isValidDatastreamName('invalid$name')).toBe(false);
    expect(isValidDatastreamName('invalid%name')).toBe(false);
    expect(isValidDatastreamName('invalid^name')).toBe(false);
    expect(isValidDatastreamName('invalid&name')).toBe(false);
    expect(isValidDatastreamName('invalid*name')).toBe(false);
    expect(isValidDatastreamName('invalid(name')).toBe(false);
    expect(isValidDatastreamName('invalid/name')).toBe(false);
  });

  it('should return false for names with dashes', () => {
    expect(isValidDatastreamName('invalid-name')).toBe(false);
    expect(isValidDatastreamName('invalid-name-with-dashes')).toBe(false);
  });

  it('should return false for names with periods', () => {
    expect(isValidDatastreamName('invalid.name')).toBe(false);
    expect(isValidDatastreamName('invalid.name.with.periods')).toBe(false);
  });

  it('should return false for names with mixed invalid characters', () => {
    expect(isValidDatastreamName('invalid@name#with$special%characters')).toBe(false);
    expect(isValidDatastreamName('invalid name with spaces and 123')).toBe(false);
  });

  it('should return false for names with empty string', () => {
    expect(isValidDatastreamName('')).toBe(false);
  });
});
