/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { times } from 'lodash';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { LATEST_MANIFEST_FORMAT_VERSION } from '@kbn/product-doc-common';
import { internalElserInferenceId } from '../../../../common/consts';
import type { ZipArchive } from '../utils/zip_archive';
import { populateIndex } from './populate_index';

const LEGACY_SEMANTIC_TEXT_VERSION = '1.0.0';

const createMockArchive = (entries: Record<string, string>): ZipArchive => {
  return {
    hasEntry: (entryPath) => Object.keys(entries).includes(entryPath),
    getEntryPaths: () => Object.keys(entries),
    getEntryContent: async (entryPath) => Buffer.from(entries[entryPath]),
    close: () => undefined,
  };
};

const createContentFile = (count: number, offset: number = 0): string => {
  return times(count)
    .map((i) => JSON.stringify({ idx: offset + i }))
    .join('\n');
};

describe('populateIndex', () => {
  let log: MockedLogger;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    log = loggerMock.create();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('calls `esClient.bulk` once per content file', async () => {
    const archive = createMockArchive({
      'content/content-0.ndjson': createContentFile(2),
      'content/content-1.ndjson': createContentFile(2),
    });

    await populateIndex({
      indexName: '.foo',
      manifestVersion: LATEST_MANIFEST_FORMAT_VERSION,
      archive,
      log,
      esClient,
    });

    expect(esClient.bulk).toHaveBeenCalledTimes(2);
  });

  it('calls `esClient.bulk` with the right payload', async () => {
    const archive = createMockArchive({
      'content/content-0.ndjson': createContentFile(2),
    });

    await populateIndex({
      indexName: '.foo',
      manifestVersion: LATEST_MANIFEST_FORMAT_VERSION,
      archive,
      log,
      esClient,
    });

    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    expect(esClient.bulk).toHaveBeenCalledWith({
      refresh: false,
      operations: [
        { index: { _index: '.foo' } },
        { idx: 0 },
        { index: { _index: '.foo' } },
        { idx: 1 },
      ],
    });
  });

  it('rewrites the inference_id of semantic fields', async () => {
    const archive = createMockArchive({
      'content/content-0.ndjson': JSON.stringify({
        semantic: 'foo',
        _inference_fields: {
          semantic: {
            inference: {
              inference_id: '.some-inference',
            },
          },
        },
      }),
    });

    await populateIndex({
      indexName: '.foo',
      manifestVersion: LATEST_MANIFEST_FORMAT_VERSION,
      archive,
      log,
      esClient,
    });

    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    expect(esClient.bulk).toHaveBeenCalledWith({
      refresh: false,
      operations: [
        { index: { _index: '.foo' } },
        {
          semantic: 'foo',
          _inference_fields: {
            semantic: {
              inference: {
                inference_id: internalElserInferenceId,
              },
            },
          },
        },
      ],
    });
  });

  it('rewrites the inference_id of semantic fields for legacy semantic_field', async () => {
    const archive = createMockArchive({
      'content/content-0.ndjson': JSON.stringify({
        semantic: { text: 'foo', inference: { inference_id: '.some-inference' } },
      }),
    });

    await populateIndex({
      indexName: '.foo',
      manifestVersion: LEGACY_SEMANTIC_TEXT_VERSION,
      archive,
      log,
      esClient,
    });

    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    expect(esClient.bulk).toHaveBeenCalledWith({
      refresh: false,
      operations: [
        { index: { _index: '.foo' } },
        {
          semantic: {
            inference: {
              inference_id: internalElserInferenceId,
            },
            text: 'foo',
          },
        },
      ],
    });
  });
});
