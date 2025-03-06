/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../actions', () => ({}));

import { DataRequestMeta, DataRequestDescriptor } from '../../../common/descriptor_types';
import {
  getDataRequest,
  setDataRequest,
  startDataRequest,
  stopDataRequest,
  updateSourceDataRequest,
} from './data_request_utils';
import { MapState } from './types';
import _ from 'lodash';

describe('getDataRequest', () => {
  const REQUEST_TOKEN = Symbol('request');
  const SOURCE_DATA_REQUEST_DESCRIPTOR = {
    dataRequestToken: REQUEST_TOKEN,
    dataId: 'source',
  } as DataRequestDescriptor;
  test('Should return undefined if layer not found', () => {
    const state = {
      layerList: [],
    } as unknown as MapState;

    expect(getDataRequest(state, 'layer1', 'source')).toBeUndefined();
  });

  test('Should return undefined if __dataRequests not provided for layer', () => {
    const state = {
      layerList: [{ id: 'layer1' }],
    } as unknown as MapState;

    expect(getDataRequest(state, 'layer1', 'source')).toBeUndefined();
  });

  test('Should return undefined if no data requests matching dataRequestId', () => {
    const state = {
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [SOURCE_DATA_REQUEST_DESCRIPTOR],
        },
      ],
    } as unknown as MapState;

    expect(getDataRequest(state, 'layer1', 'join')).toBeUndefined();
  });

  test('Should return data request with dataRequestId match', () => {
    const state = {
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [SOURCE_DATA_REQUEST_DESCRIPTOR],
        },
      ],
    } as unknown as MapState;

    expect(getDataRequest(state, 'layer1', 'source')).toEqual(SOURCE_DATA_REQUEST_DESCRIPTOR);
  });

  test('Should return undefined with dataRequestId match and requestToken mismatch', () => {
    const state = {
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [SOURCE_DATA_REQUEST_DESCRIPTOR],
        },
      ],
    } as unknown as MapState;

    expect(getDataRequest(state, 'layer1', 'source', Symbol('another_request'))).toBeUndefined();
  });

  test('Should return data request with dataRequestId match and requestToken match', () => {
    const state = {
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [SOURCE_DATA_REQUEST_DESCRIPTOR],
        },
      ],
    } as unknown as MapState;

    expect(getDataRequest(state, 'layer1', 'source', REQUEST_TOKEN)).toEqual(
      SOURCE_DATA_REQUEST_DESCRIPTOR
    );
  });
});

describe('setDataRequest', () => {
  const UPDATED_DATA_REQUEST_DESCRIPTOR = {
    dataId: 'source',
    data: { value: 'a' },
  } as DataRequestDescriptor;

  test('Should return unmodified state if layer not found', () => {
    const state = {
      layerList: [],
    } as unknown as MapState;
    const stateClone = _.cloneDeep(state);
    expect(setDataRequest(state, 'layer1', UPDATED_DATA_REQUEST_DESCRIPTOR)).toEqual(state);
    expect(state).toEqual(stateClone);
  });

  test('Should add data request if data request not found', () => {
    const state = {
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [],
        },
      ],
    } as unknown as MapState;
    const stateClone = _.cloneDeep(state);
    expect(setDataRequest(state, 'layer1', UPDATED_DATA_REQUEST_DESCRIPTOR)).toEqual({
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [UPDATED_DATA_REQUEST_DESCRIPTOR],
        },
      ],
    });
    expect(state).toEqual(stateClone);
  });

  test('Should update data request', () => {
    const state = {
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [{ dataId: 'source' }],
        },
      ],
    } as unknown as MapState;
    const stateClone = _.cloneDeep(state);
    expect(setDataRequest(state, 'layer1', UPDATED_DATA_REQUEST_DESCRIPTOR)).toEqual({
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [UPDATED_DATA_REQUEST_DESCRIPTOR],
        },
      ],
    });
    expect(state).toEqual(stateClone);
  });
});

describe('startDataRequest', () => {
  const REQUEST_TOKEN = Symbol('request');
  const DATA_META_AT_START = {
    prop1: 'value',
  } as DataRequestMeta;

  test('Should return unmodified state if layer not found', () => {
    const state = {
      layerList: [],
    } as unknown as MapState;
    const stateClone = _.cloneDeep(state);
    expect(startDataRequest(state, 'layer1', 'source', REQUEST_TOKEN, DATA_META_AT_START)).toEqual(
      state
    );
    expect(state).toEqual(stateClone);
  });

  test('Should add data request if no data requests for dataRequestId', () => {
    const state = {
      layerList: [
        {
          id: 'layer1',
        },
      ],
    } as unknown as MapState;
    const stateClone = _.cloneDeep(state);
    expect(startDataRequest(state, 'layer1', 'source', REQUEST_TOKEN, DATA_META_AT_START)).toEqual({
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [
            {
              dataId: 'source',
              dataRequestMetaAtStart: DATA_META_AT_START,
              dataRequestToken: REQUEST_TOKEN,
            },
          ],
        },
      ],
    });
    expect(state).toEqual(stateClone);
  });

  test('Should update existing data request for onStartLoading event', () => {
    const state = {
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [
            {
              dataId: 'source',
              dataRequestMetaAtStart: { prop1: 'old value' },
              dataRequestToken: Symbol('request'),
            },
          ],
        },
      ],
    } as unknown as MapState;
    const stateClone = _.cloneDeep(state);
    expect(startDataRequest(state, 'layer1', 'source', REQUEST_TOKEN, DATA_META_AT_START)).toEqual({
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [
            {
              dataId: 'source',
              dataRequestMetaAtStart: DATA_META_AT_START,
              dataRequestToken: REQUEST_TOKEN,
            },
          ],
        },
      ],
    });
    expect(state).toEqual(stateClone);
  });
});

describe('stopDataRequest', () => {
  const REQUEST_TOKEN = Symbol('request');

  test('Should return unmodified state if layer not found', () => {
    const state = {
      layerList: [],
    } as unknown as MapState;
    const stateClone = _.cloneDeep(state);
    expect(stopDataRequest(state, 'layer1', 'source', REQUEST_TOKEN)).toEqual(state);
    expect(state).toEqual(stateClone);
  });

  test('Should return unmodified state if data request not found (unmatching request token)', () => {
    const state = {
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [
            {
              dataId: 'source',
              dataRequestToken: Symbol('request'),
            },
          ],
        },
      ],
    } as unknown as MapState;
    const stateClone = _.cloneDeep(state);
    expect(stopDataRequest(state, 'layer1', 'source', REQUEST_TOKEN)).toEqual(state);
    expect(state).toEqual(stateClone);
  });

  test('Should update data request with response meta and data', () => {
    const state = {
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [
            {
              dataId: 'source',
              dataRequestToken: REQUEST_TOKEN,
              dataRequestMetaAtStart: { requestProp1: 'request' },
              data: { prop1: 'old data ' },
            },
          ],
        },
      ],
    } as unknown as MapState;
    const stateClone = _.cloneDeep(state);
    const reponseMeta = { responseProp1: 'response' } as DataRequestMeta;
    const data = { prop1: 'new data' };
    const newState = stopDataRequest(state, 'layer1', 'source', REQUEST_TOKEN, reponseMeta, data);
    // remove timestamp since it changes every run
    delete newState.layerList[0].__dataRequests![0].dataRequestMeta!.requestStopTime;
    expect(newState).toEqual({
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [
            {
              dataId: 'source',
              dataRequestMeta: { requestProp1: 'request', responseProp1: 'response' },
              data: { prop1: 'new data' },
              dataRequestMetaAtStart: undefined,
              dataRequestToken: undefined,
            },
          ],
        },
      ],
    });
    expect(state).toEqual(stateClone);
  });
});

describe('updateSourceDataRequest', () => {
  const NEW_DATA = {
    prop1: 'new value',
  };

  test('Should return unmodified state if layer not found', () => {
    const state = {
      layerList: [],
    } as unknown as MapState;
    const stateClone = _.cloneDeep(state);
    expect(updateSourceDataRequest(state, 'layer1', NEW_DATA)).toEqual(state);
    expect(state).toEqual(stateClone);
  });

  test('Should return unmodified state if source data request not found', () => {
    const state = {
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [],
        },
      ],
    } as unknown as MapState;
    const stateClone = _.cloneDeep(state);
    expect(updateSourceDataRequest(state, 'layer1', NEW_DATA)).toEqual(state);
    expect(state).toEqual(stateClone);
  });

  test('Should update source data request', () => {
    const state = {
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [
            {
              dataId: 'source',
              data: { prop1: 'old value' },
            },
          ],
        },
      ],
    } as unknown as MapState;
    const stateClone = _.cloneDeep(state);
    expect(updateSourceDataRequest(state, 'layer1', NEW_DATA)).toEqual({
      layerList: [
        {
          id: 'layer1',
          __dataRequests: [
            {
              dataId: 'source',
              data: NEW_DATA,
            },
          ],
        },
      ],
    });
    expect(state).toEqual(stateClone);
  });
});
