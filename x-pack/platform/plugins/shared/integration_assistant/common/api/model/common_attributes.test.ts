/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers';
import {
  Connector,
  DataStream,
  DataStreamName,
  Integration,
  PackageName,
  PackageTitle,
  Pipeline,
} from './common_attributes.gen';
import { getDataStreamMock, getIntegrationMock, getPipelineMock } from './api_test.mock';

describe('Common attributes schema validation', () => {
  describe('Connector', () => {
    test('accepts a valid connector id', () => {
      expectParseSuccess(Connector.safeParse('my-connector-id'));
    });

    test('rejects an empty string', () => {
      expectParseError(Connector.safeParse(''));
    });

    test('rejects a whitespace-only string', () => {
      expectParseError(Connector.safeParse('   '));
    });

    test('rejects a tab/newline-only string', () => {
      expectParseError(Connector.safeParse('\t\n'));
    });

    test('rejects a string exceeding 256 chars', () => {
      expectParseError(Connector.safeParse('x'.repeat(257)));
    });

    test('accepts a string at exactly 256 chars', () => {
      expectParseSuccess(Connector.safeParse('x'.repeat(256)));
    });
  });

  describe('PackageName', () => {
    test('rejects whitespace-only', () => {
      expectParseError(PackageName.safeParse('  '));
    });

    test('rejects string over 256 chars', () => {
      expectParseError(PackageName.safeParse('a'.repeat(257)));
    });

    test('accepts string at 256 chars', () => {
      expectParseSuccess(PackageName.safeParse('a'.repeat(256)));
    });
  });

  describe('DataStreamName', () => {
    test('rejects whitespace-only', () => {
      expectParseError(DataStreamName.safeParse('  '));
    });

    test('rejects string over 256 chars', () => {
      expectParseError(DataStreamName.safeParse('a'.repeat(257)));
    });
  });

  describe('PackageTitle', () => {
    test('rejects whitespace-only', () => {
      expectParseError(PackageTitle.safeParse('  '));
    });

    test('rejects string over 256 chars', () => {
      expectParseError(PackageTitle.safeParse('a'.repeat(257)));
    });
  });

  describe('Pipeline', () => {
    test('accepts a valid pipeline', () => {
      expectParseSuccess(Pipeline.safeParse(getPipelineMock()));
    });

    test('rejects more than 500 processors', () => {
      const result = Pipeline.safeParse({
        ...getPipelineMock(),
        processors: new Array(501).fill({ set: { field: 'x', value: 'y' } }),
      });
      expectParseError(result);
    });

    test('accepts exactly 500 processors', () => {
      const result = Pipeline.safeParse({
        ...getPipelineMock(),
        processors: new Array(500).fill({ set: { field: 'x', value: 'y' } }),
      });
      expectParseSuccess(result);
    });

    test('rejects processor description over 4096 chars', () => {
      const result = Pipeline.safeParse({
        ...getPipelineMock(),
        description: 'd'.repeat(4097),
      });
      expectParseError(result);
    });

    test('accepts processor description at 4096 chars', () => {
      const result = Pipeline.safeParse({
        ...getPipelineMock(),
        description: 'd'.repeat(4096),
      });
      expectParseSuccess(result);
    });
  });

  describe('DataStream', () => {
    test('accepts a valid data stream', () => {
      expectParseSuccess(DataStream.safeParse(getDataStreamMock()));
    });

    test('rejects whitespace-only name', () => {
      expectParseError(DataStream.safeParse({ ...getDataStreamMock(), name: '   ' }));
    });

    test('rejects name over 256 chars', () => {
      expectParseError(DataStream.safeParse({ ...getDataStreamMock(), name: 'n'.repeat(257) }));
    });

    test('rejects whitespace-only title', () => {
      expectParseError(DataStream.safeParse({ ...getDataStreamMock(), title: '   ' }));
    });

    test('rejects description over 4096 chars', () => {
      expectParseError(
        DataStream.safeParse({ ...getDataStreamMock(), description: 'd'.repeat(4097) })
      );
    });

    test('accepts description at 4096 chars', () => {
      expectParseSuccess(
        DataStream.safeParse({ ...getDataStreamMock(), description: 'd'.repeat(4096) })
      );
    });
  });

  describe('Integration', () => {
    test('accepts a valid integration', () => {
      expectParseSuccess(Integration.safeParse(getIntegrationMock()));
    });

    test('rejects whitespace-only name', () => {
      expectParseError(Integration.safeParse({ ...getIntegrationMock(), name: '   ' }));
    });

    test('rejects name over 256 chars', () => {
      expectParseError(Integration.safeParse({ ...getIntegrationMock(), name: 'n'.repeat(257) }));
    });

    test('rejects whitespace-only title', () => {
      expectParseError(Integration.safeParse({ ...getIntegrationMock(), title: '   ' }));
    });

    test('rejects description over 4096 chars', () => {
      expectParseError(
        Integration.safeParse({ ...getIntegrationMock(), description: 'd'.repeat(4097) })
      );
    });

    test('rejects more than 50 data streams', () => {
      const result = Integration.safeParse({
        ...getIntegrationMock(),
        dataStreams: new Array(51).fill(getDataStreamMock()),
      });
      expectParseError(result);
    });

    test('accepts exactly 50 data streams', () => {
      const result = Integration.safeParse({
        ...getIntegrationMock(),
        dataStreams: new Array(50).fill(getDataStreamMock()),
      });
      expectParseSuccess(result);
    });
  });
});
