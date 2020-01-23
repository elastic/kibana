/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../actions/map_actions', () => ({}));

import { resetDataRequest } from './map';

describe('reducers/map', () => {
  it('Should clear datarequest without mutation store state', async () => {
    const layerId = 'foobar';
    const requestToken = 'tokenId';
    const dataId = 'dataId';

    const preState = {
      layerList: [
        {
          id: `not_${layerId}`,
        },
        {
          id: layerId,
          __dataRequests: [
            {
              dataRequestToken: `not_${requestToken}`,
              dataId: `not_${dataId}`,
            },
            {
              dataRequestToken: requestToken,
              dataId: dataId,
            },
          ],
        },
      ],
    };

    const action = {
      layerId,
      requestToken,
      dataId,
    };

    const postState = resetDataRequest(preState, action);

    expect(postState === preState).toEqual(false);
    expect(postState.layerList === preState.layerList).toEqual(false);
    expect(postState.layerList.length).toEqual(2);
    expect(postState.layerList[1].__dataRequests.length).toEqual(2);
    expect(postState.layerList[1].__dataRequests === preState.layerList[1].__dataRequests).toEqual(
      false
    );
    expect(postState.layerList[1].__dataRequests === preState.layerList[1].__dataRequests).toEqual(
      false
    );
    expect(
      postState.layerList[1].__dataRequests[1] === preState.layerList[1].__dataRequests[1]
    ).toEqual(false);
    expect(postState.layerList[1].__dataRequests[1].dataId).toEqual(dataId);
    expect(postState.layerList[1].__dataRequests[1].dataRequestToken).toEqual(null);
  });
});
