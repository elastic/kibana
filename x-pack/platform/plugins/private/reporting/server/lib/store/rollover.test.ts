/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  REPORTING_DATA_STREAM_ALIAS,
  REPORTING_DATA_STREAM_INDEX_TEMPLATE,
  REPORTING_INDEX_TEMPLATE_MAPPING_META_FIELD,
} from '@kbn/reporting-server';
import type {
  IndicesGetIndexTemplateIndexTemplateItem,
  IndicesGetMappingResponse,
} from '@elastic/elasticsearch/lib/api/types';

import { rollDataStreamIfRequired } from './rollover';

describe('rollDataStreamIfRequired', () => {
  const mockLogger = loggingSystemMock.createLogger();
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(async () => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  const msgPrefix = `Data stream ${REPORTING_DATA_STREAM_ALIAS}`;
  const skipMessage = 'does not need to be rolled over';
  const rollMessage = 'rolling over the data stream';

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('does nothing if there is no data stream', async () => {
    mockEsClient.indices.exists.mockResponse(false);
    await rollDataStreamIfRequired(mockLogger, mockEsClient);

    expect(mockEsClient.indices.exists).toHaveBeenCalledWith({
      index: REPORTING_DATA_STREAM_ALIAS,
      expand_wildcards: 'all',
    });
    expect(mockLogger.debug).toHaveBeenCalledWith(`${msgPrefix} does not exist so ${skipMessage}`);
    expect(mockEsClient.indices.getIndexTemplate).not.toHaveBeenCalled();
    expect(mockEsClient.indices.getMapping).not.toHaveBeenCalled();
    expect(mockEsClient.indices.rollover).not.toHaveBeenCalled();
  });

  it('throws an error if no index template is returned', async () => {
    mockEsClient.indices.exists.mockResponse(true);
    mockEsClient.indices.getIndexTemplate.mockResponse({ index_templates: [] });
    const err = `${msgPrefix} index template ${REPORTING_DATA_STREAM_INDEX_TEMPLATE} not found`;
    await expect(rollDataStreamIfRequired(mockLogger, mockEsClient)).rejects.toThrow(err);

    expect(mockEsClient.indices.getIndexTemplate).toHaveBeenCalledWith({
      name: REPORTING_DATA_STREAM_INDEX_TEMPLATE,
    });
    expect(mockEsClient.indices.getMapping).not.toHaveBeenCalled();
    expect(mockEsClient.indices.rollover).not.toHaveBeenCalled();
  });

  it('throws an error if there is no index template with a version', async () => {
    mockEsClient.indices.exists.mockResponse(true);
    const templateWithoutVersion = getBasicIndexTemplate();
    delete templateWithoutVersion.index_template.version;
    mockEsClient.indices.getIndexTemplate.mockResponse({
      index_templates: [templateWithoutVersion],
    });

    const err = `${msgPrefix} index template ${REPORTING_DATA_STREAM_INDEX_TEMPLATE} does not have a version field`;
    await expect(rollDataStreamIfRequired(mockLogger, mockEsClient)).rejects.toThrow(err);

    expect(mockEsClient.indices.getMapping).not.toHaveBeenCalled();
    expect(mockEsClient.indices.rollover).not.toHaveBeenCalled();
  });

  it('does nothing if there are no mappings on the backing indices', async () => {
    mockEsClient.indices.exists.mockResponse(true);
    mockEsClient.indices.getIndexTemplate.mockResponse({
      index_templates: [getBasicIndexTemplate()],
    });
    mockEsClient.indices.getMapping.mockResponse({});
    await rollDataStreamIfRequired(mockLogger, mockEsClient);

    const msg = `${msgPrefix} has no backing indices so ${skipMessage}`;
    expect(mockLogger.debug).toHaveBeenCalledWith(msg);
    expect(mockEsClient.indices.rollover).not.toHaveBeenCalled();
  });

  it('rolls over the data stream if there are no versions in the backing index mappings', async () => {
    mockEsClient.indices.exists.mockResponse(true);
    mockEsClient.indices.getIndexTemplate.mockResponse({
      index_templates: [getBasicIndexTemplate()],
    });
    const mappings: IndicesGetMappingResponse = {
      indexName: {
        mappings: { _meta: {} },
      },
    };
    mockEsClient.indices.getMapping.mockResponse(mappings);
    await rollDataStreamIfRequired(mockLogger, mockEsClient);

    const msg = `${msgPrefix} has no mapping versions so ${rollMessage}`;
    expect(mockLogger.info).toHaveBeenCalledWith(msg);
    expect(mockEsClient.indices.rollover).toHaveBeenCalled();
  });

  it('rolls over the data stream if the index template version is newer than the backing index mappings versions', async () => {
    mockEsClient.indices.exists.mockResponse(true);
    mockEsClient.indices.getIndexTemplate.mockResponse({
      index_templates: [getBasicIndexTemplate()],
    });
    const mappings: IndicesGetMappingResponse = {
      indexName: {
        mappings: { _meta: { [REPORTING_INDEX_TEMPLATE_MAPPING_META_FIELD]: 41 } },
      },
    };
    mockEsClient.indices.getMapping.mockResponse(mappings);
    await rollDataStreamIfRequired(mockLogger, mockEsClient);

    const msg = `${msgPrefix} has older mappings than the template so ${rollMessage}`;
    expect(mockLogger.info).toHaveBeenCalledWith(msg);
    expect(mockEsClient.indices.rollover).toHaveBeenCalled();
  });

  it('throws an error if the index template version is older than the backing index mappings versions', async () => {
    mockEsClient.indices.exists.mockResponse(true);
    mockEsClient.indices.getIndexTemplate.mockResponse({
      index_templates: [getBasicIndexTemplate()],
    });
    const mappings: IndicesGetMappingResponse = {
      indexName: {
        mappings: { _meta: { [REPORTING_INDEX_TEMPLATE_MAPPING_META_FIELD]: 43 } },
      },
    };
    mockEsClient.indices.getMapping.mockResponse(mappings);
    const err = `${msgPrefix} has newer mappings than the template`;
    await expect(rollDataStreamIfRequired(mockLogger, mockEsClient)).rejects.toThrow(err);

    expect(mockEsClient.indices.rollover).not.toHaveBeenCalled();
  });

  it('does nothing if the index template version is not newer than the backing index mapping versions', async () => {
    mockEsClient.indices.exists.mockResponse(true);
    mockEsClient.indices.getIndexTemplate.mockResponse({
      index_templates: [getBasicIndexTemplate()],
    });
    const mappings: IndicesGetMappingResponse = {
      indexName: {
        mappings: { _meta: { [REPORTING_INDEX_TEMPLATE_MAPPING_META_FIELD]: 42 } },
      },
    };
    mockEsClient.indices.getMapping.mockResponse(mappings);
    await rollDataStreamIfRequired(mockLogger, mockEsClient);

    const msg = `${msgPrefix} has latest mappings applied so ${skipMessage}`;
    expect(mockLogger.debug).toHaveBeenCalledWith(msg);
    expect(mockEsClient.indices.rollover).not.toHaveBeenCalled();
  });
});

function getBasicIndexTemplate(): IndicesGetIndexTemplateIndexTemplateItem {
  return {
    name: REPORTING_DATA_STREAM_INDEX_TEMPLATE,
    index_template: {
      index_patterns: ['ignored'],
      composed_of: ['ignored'],
      version: 42,
    },
  };
}
