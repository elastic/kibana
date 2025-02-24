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

const testIndices = {
  'non-ent-search-index': {
    settings: {
      index: {
        version: {
          created: '7.0.0',
        },
      },
    },
  },
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

const additionalDatastreams = {
  'logs-app_search.testdatastream': {
    indices: [
      { index_name: 'non-existingindex' },
      { index_name: '.ent-search-with_same_data_stream' },
    ],
  },
};

const testIndicesWithoutDatastream = {
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

function getMockIndicesFxn(values: any) {
  return jest.fn((params) => {
    let prefix = params.index;
    let isWildcard = false;
    if (params.index.endsWith('*')) {
      prefix = params.index.slice(0, -1);
      isWildcard = true;
    }
    const ret: any = {};
    for (const [index, indexData] of Object.entries(values)) {
      if (index === prefix || (isWildcard && index.startsWith(prefix))) {
        ret[index] = indexData;
      }
    }
    return Promise.resolve(ret);
  });
}

function getMockDatastreamsFxn(values: any) {
  return jest.fn((params) => {
    const prefixes = [];
    const names = params.name.split(',');
    for (const name of names) {
      if (name.endsWith('*')) {
        prefixes.push(name.slice(0, -1));
      } else {
        prefixes.push(name);
      }
    }

    const ret: any = {};
    for (const [datastream, datastreamData] of Object.entries(values)) {
      for (const prefix of prefixes) {
        if (datastream.startsWith(prefix)) {
          ret[datastream] = datastreamData;
          break;
        }
      }
      return Promise.resolve(ret);
    }
  });
}

describe('getPreEightEnterpriseSearchIndices', () => {
  const getIndicesMock = getMockIndicesFxn(testIndices);
  const getDatastreamsMock = getMockDatastreamsFxn(additionalDatastreams);
  const esClientMock = {
    indices: {
      get: getIndicesMock,
      getDataStream: getDatastreamsMock,
    },
  } as unknown as ElasticsearchClient;

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
        datastreams: ['datastream-testing', 'logs-app_search.testdatastream'],
      },
    ]);
  });
});

describe('setPreEightEnterpriseSearchIndicesReadOnly', () => {
  it('does not rollover datastreams if there are none', async () => {
    const getIndicesMock = getMockIndicesFxn(testIndicesWithoutDatastream);
    const getDatastreamsMock = jest.fn(() => Promise.resolve({}));
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
    const getIndicesMock = getMockIndicesFxn(testIndices);
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
    expect(getIndicesMock).toHaveBeenCalledTimes(2);
    expect(rolloverMock).toHaveBeenCalledTimes(3);
    expect(addBlockMock).toHaveBeenCalledTimes(4);
  });
});
