/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import {
  getPreEightEnterpriseSearchIndices,
  setPreEightEnterpriseSearchIndicesReadOnly,
} from './pre_eight_index_deprecator';
import type {
  IndicesDataStream,
  IndicesGetDataStreamResponse,
  IndicesGetResponse,
  IndicesIndexState,
} from '@elastic/elasticsearch/lib/api/types';

const testIndices = {
  '.ent-search-already_read_only': {
    settings: {
      index: {
        version: {
          created: '7.0.0',
        },
        blocks: {
          write: 'true',
        },
        verified_read_only: 'true',
      },
    },
    data_stream: 'datastream-123',
  },
  '.ent-search-post_7_index': {
    settings: {
      index: {
        version: {
          created: '8.0.0',
        },
      },
    },
  },
  '.ent-search-index_without_datastream': {
    settings: {
      index: {
        version: {
          created: '7.0.0',
        },
      },
    },
  },
  '.ent-search-with_data_stream': {
    settings: {
      index: {
        version: {
          created: '7.0.0',
        },
      },
    },
    data_stream: 'datastream-testing',
  },
  '.ent-search-with_another_data_stream': {
    settings: {
      index: {
        version: {
          created: '7.0.0',
        },
      },
    },
    data_stream: 'datastream-testing-another',
  },
  '.ent-search-with_same_data_stream': {
    settings: {
      index: {
        version: {
          created: '7.0.0',
        },
      },
    },
    data_stream: 'datastream-testing',
  },
};

const testBackingIndex = {
  '.ds-some-other-backing-index': {
    settings: {
      index: {
        version: {
          created: '7.0.0',
        },
      },
    },
    data_stream: 'logs-app_search.testdatastream',
  },
};

const additionalDatastreams: Record<string, IndicesDataStream> = {
  'logs-app_search.testdatastream': {
    name: 'logs-app_search.testdatastream',
    indices: [
      { index_name: '.ds-some-other-backing-index', index_uuid: '1' },
      { index_name: '.ent-search-with_same_data_stream', index_uuid: '2' },
    ],
  } as IndicesDataStream,
};

const testIndicesWithoutDatastream: Record<string, IndicesIndexState> = {
  '.ent-search-already_read_only': {
    settings: {
      index: {
        version: {
          created: '7.0.0',
        },
        blocks: {
          write: 'true',
        },
        verified_read_only: 'true',
      },
    },
  },
  '.ent-search-post_7_index': {
    settings: {
      index: {
        version: {
          created: '8.0.0',
        },
      },
    },
  },
  '.ent-search-index_without_datastream': {
    settings: {
      index: {
        version: {
          created: '7.0.0',
        },
      },
    },
  },
};

function getMockIndicesFxn(values: Record<string, IndicesIndexState>) {
  return () => {
    const ret: IndicesGetResponse = {};
    for (const [index, indexData] of Object.entries(values)) {
      ret[index] = indexData;
    }
    return Promise.resolve(ret);
  };
}

function getMockDatastreamsFxn(values: Record<string, IndicesDataStream>) {
  return () => {
    const ret: IndicesGetDataStreamResponse = { data_streams: [] };
    for (const [, datastreamData] of Object.entries(values)) {
      ret.data_streams.push(datastreamData);
    }
    return Promise.resolve(ret);
  };
}

describe('getPreEightEnterpriseSearchIndices', () => {
  let esClientMock: ElasticsearchClient;
  let getIndicesMock: jest.Mock;
  let getDatastreamsMock: jest.Mock;
  beforeEach(() => {
    getIndicesMock = jest.fn();
    getIndicesMock.mockImplementationOnce(getMockIndicesFxn(testIndices));
    getIndicesMock.mockImplementationOnce(getMockIndicesFxn(testBackingIndex));

    getDatastreamsMock = jest.fn(getMockDatastreamsFxn(additionalDatastreams));
    esClientMock = {
      indices: {
        get: getIndicesMock,
        getDataStream: getDatastreamsMock,
      },
    } as unknown as ElasticsearchClient;
  });

  it('returns the correct indices', async () => {
    const indices = await getPreEightEnterpriseSearchIndices(esClientMock);
    expect(indices).toEqual([
      {
        name: '.ent-search-index_without_datastream',
        hasDatastream: false,
        datastreams: [''],
      },
      {
        name: '.ent-search-with_data_stream',
        hasDatastream: true,
        datastreams: ['datastream-testing'],
      },
      {
        name: '.ent-search-with_another_data_stream',
        hasDatastream: true,
        datastreams: ['datastream-testing-another'],
      },
      {
        name: '.ent-search-with_same_data_stream',
        hasDatastream: true,
        datastreams: ['datastream-testing'],
      },
      {
        name: '.ds-some-other-backing-index',
        hasDatastream: true,
        datastreams: ['logs-app_search.testdatastream'],
      },
    ]);
    expect(getIndicesMock).toHaveBeenCalledTimes(2);
    expect(getIndicesMock).toHaveBeenNthCalledWith(1, {
      expand_wildcards: ['all', 'hidden'],
      ignore_unavailable: true,
      index: '.ent-search-*',
    });
    expect(getIndicesMock).toHaveBeenNthCalledWith(2, {
      ignore_unavailable: true,
      index: ['.ds-some-other-backing-index'],
    });

    expect(getDatastreamsMock).toHaveBeenCalledTimes(1);
    expect(getDatastreamsMock).toHaveBeenCalledWith({
      expand_wildcards: ['all', 'hidden'],
      name: 'logs-enterprise_search.*,logs-app_search.*,logs-workplace_search.*',
    });
  });
});

describe('setPreEightEnterpriseSearchIndicesReadOnly', () => {
  it('does not rollover datastreams if there are none', async () => {
    const getIndicesMock = jest.fn(getMockIndicesFxn(testIndicesWithoutDatastream));
    const getDatastreamsMock = jest.fn(() => Promise.resolve({ data_streams: [] }));
    const rolloverMock = jest.fn(() => Promise.resolve(true));
    const addBlockMock = jest.fn(() => Promise.resolve({ acknowledged: true }));
    const esClientMock = {
      indices: {
        get: getIndicesMock,
        getDataStream: getDatastreamsMock,
        rollover: rolloverMock,
        addBlock: addBlockMock,
      },
    } as unknown as ElasticsearchClient;

    const result = await setPreEightEnterpriseSearchIndicesReadOnly(esClientMock);
    expect(result).toEqual('');
    expect(getIndicesMock).toHaveBeenCalledTimes(1);
    expect(rolloverMock).not.toHaveBeenCalled();
    expect(addBlockMock).toHaveBeenCalledTimes(1);
  });

  it('does rollover datastreams if there are any', async () => {
    const getIndicesMock = jest.fn();
    getIndicesMock.mockImplementationOnce(getMockIndicesFxn(testIndices));
    getIndicesMock.mockImplementationOnce(getMockIndicesFxn(testBackingIndex));
    getIndicesMock.mockImplementationOnce(getMockIndicesFxn(testIndices));
    getIndicesMock.mockImplementationOnce(getMockIndicesFxn(testBackingIndex));

    const getDatastreamsMock = getMockDatastreamsFxn(additionalDatastreams);
    const rolloverMock = jest.fn(() => Promise.resolve(true));
    const addBlockMock = jest.fn(() => Promise.resolve({ acknowledged: true }));
    const esClientMock = {
      indices: {
        get: getIndicesMock,
        getDataStream: getDatastreamsMock,
        rollover: rolloverMock,
        addBlock: addBlockMock,
      },
    } as unknown as ElasticsearchClient;

    const result = await setPreEightEnterpriseSearchIndicesReadOnly(esClientMock);
    expect(result).toEqual('');
    expect(getIndicesMock).toHaveBeenCalledTimes(4);
    expect(rolloverMock).toHaveBeenCalledTimes(3);
    expect(addBlockMock).toHaveBeenCalledTimes(5);
  });
});
